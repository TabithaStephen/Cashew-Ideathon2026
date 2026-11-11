'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../_lib/i18n';
import { checks, compareRows, docBl, docInvoice, docInvoiceAmended, type Check, type DocField } from '../_lib/data';
import { Blank, ErrorBlank, PageHead, SkeletonRows, StateBar, Status, TradeTag, useViewState } from '../_ui/parts';

const REVIEW_BELOW = 0.85;
type Fix = 'none' | 'running' | 'done';

function DocPreview({ title, fields }: { title: string; fields: DocField[] }) {
  const { t } = useLang();
  return (
    <figure className="mf-doc" style={{ margin: 0 }}>
      <figcaption className="mf-doc-head">{title}</figcaption>
      {fields.map((field) => {
        const review = field.confidence < REVIEW_BELOW;
        const tone = field.tone === 'bad' ? 'mf-field-bad' : field.tone === 'ok' ? 'mf-field-ok' : review ? 'mf-field-review' : '';
        return (
          <div key={field.label} className={`mf-field ${tone}`} title={`${t('confidence')}: ${field.confidence.toFixed(2)}`}>
            <span>
              {field.label}
              {review ? ` · ${t('needsReview')} (${field.confidence.toFixed(2)})` : ''}
            </span>
            <span className="mf-num">{field.value}</span>
          </div>
        );
      })}
    </figure>
  );
}

function Check8Detail({ fix }: { fix: Fix }) {
  const { t } = useLang();
  const fixed = fix === 'done';
  const rows = fixed ? compareRows.after : compareRows.before;
  return (
    <div className="mf-stack" style={{ gap: 12 }}>
      <div className="mf-docs" style={{ margin: 0 }}>
        <DocPreview title="Commercial Invoice" fields={fixed ? docInvoiceAmended : docInvoice} />
        <DocPreview title="Bill of Lading" fields={docBl} />
      </div>
      <div>
        <p className="mf-label" style={{ margin: '0 0 4px' }}>
          {t('whatWeFound')}
        </p>
        <div className="mf-scroll">
          <table className="mf-table">
            <thead>
              <tr>
                <th scope="col">{t('document')}</th>
                <th scope="col">{t('sigAmount')}</th>
                <th scope="col">{t('quantity')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.doc}>
                  <th scope="row">{row.doc}</th>
                  <td className={`mf-num ${row.bad ? 'mf-cell-bad' : ''}`}>{row.value}</td>
                  <td className={`mf-num ${row.bad ? 'mf-cell-bad' : ''}`}>{row.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mf-small mf-muted" style={{ margin: 0 }}>
        {fixed ? t('partialNote') : '600 pcs were not shipped. The invoice may overstate the goods by USD 3,750.'}
      </p>
      <p className="mf-small mf-muted" style={{ margin: 0 }}>
        {t('namesMatched')}
      </p>
    </div>
  );
}

function CheckRow({ check, fix }: { check: Check; fix: Fix }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const isEight = check.id === 8;

  const status = isEight ? (fix === 'running' ? 'checking' : fix === 'done' ? 'pass' : 'fail') : check.status;
  const line = isEight
    ? fix === 'running'
      ? t('fixRunning')
      : fix === 'done'
        ? 'Invoice, Packing List, Shipping Bill and Bill of Lading all show 4,200 pcs.'
        : check.line
    : check.line;

  return (
    <div className="mf-row">
      <button type="button" className="mf-row-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="mf-c-n mf-mono mf-muted">{check.id}</span>
        <span className="mf-c-title">
          <span className="mf-row-title">{check.title[lang]}</span>
          <span className="mf-row-line" lang="en">
            {line}
          </span>
        </span>
        <span className="mf-c-source mf-small" lang="en">
          {check.source}
        </span>
        <span className="mf-c-status">
          <Status kind={status} />
        </span>
        <span className="mf-c-time mf-small mf-num" lang="en">
          {check.at}
        </span>
        <ChevronDown className="mf-chev" size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="mf-row-open mf-stack" style={{ gap: 12 }}>
          {isEight && <Check8Detail fix={fix} />}
          <dl className="mf-kv mf-small">
            <dt className="mf-label">{t('colSource')}</dt>
            <dd>
              {check.source} · {check.computed ? t('sourceComputed') : t('sourceSimulated')}
            </dd>
            <dt className="mf-label">{t('colChecked')}</dt>
            <dd className="mf-num">{check.at}</dd>
            <dt className="mf-label">{t('evidenceRef')}</dt>
            <dd className="mf-mono">{check.ref}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

export default function VerificationPage() {
  const { t } = useLang();
  const { state, setState, retry } = useViewState();
  const [fix, setFix] = useState<Fix>('none');
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const upload = () => {
    setFix('running');
    timer.current = window.setTimeout(() => setFix('done'), 1400);
  };

  const counts = { pass: 0, fail: 0, unknown: 0, pending: 0 };
  for (const check of checks) {
    if (check.id === 8 && fix !== 'none') {
      if (fix === 'done') counts.pass += 1;
      else counts.pending += 1;
    } else {
      counts[check.status] += 1;
    }
  }

  return (
    <div className="mf-stack">
      <StateBar state={state} onChange={setState} />
      <PageHead title={t('verifyTitle')} intro={t('verifyIntro')} />
      <TradeTag amended={fix === 'done'} />

      {state === 'loading' && <SkeletonRows rows={8} label={t('stateLoading')} />}
      {state === 'error' && <ErrorBlank message={t('verifyError')} onRetry={retry} />}
      {state === 'empty' && (
        <Blank action={<button type="button" className="mf-btn mf-btn-primary">{t('verifyEmptyAction')}</button>}>
          {t('verifyEmpty')}
        </Blank>
      )}

      {state === 'ready' && (
        <>
          <div className="mf-tally" aria-live="polite">
            {(['pass', 'fail', 'unknown', 'pending'] as const).map((kind) => (
              <div key={kind}>
                <span className="mf-money-lg" style={{ display: 'block' }}>
                  {counts[kind]}
                </span>
                <Status kind={kind} />
              </div>
            ))}
          </div>

          {fix !== 'done' && (
            <div className="mf-note mf-note-fail mf-sticky-host" role="status">
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{t('fixTitle')}</p>
              <p style={{ margin: '0 0 12px' }} lang="en">
                Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.
              </p>
              <button type="button" className="mf-btn mf-btn-primary" disabled={fix === 'running'} onClick={upload}>
                {fix === 'running' ? t('fixRunning') : t('fixAction')}
              </button>
            </div>
          )}
          {fix === 'done' && (
            <div className="mf-note mf-note-pass" role="status">
              {t('fixDone')}
            </div>
          )}

          <div className="mf-ledger">
            <div className="mf-row-head mf-label">
              <span>#</span>
              <span>{t('colCheck')}</span>
              <span>{t('colSource')}</span>
              <span>{t('colStatus')}</span>
              <span>{t('colChecked')}</span>
              <span />
            </div>
            {checks.map((check) => (
              <CheckRow key={check.id} check={check} fix={fix} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
