'use client';

import { AlertTriangle, Check, Copy, OctagonX } from 'lucide-react';
import { useState } from 'react';
import type { InvoiceFacts, SimilaritySignal } from '@/lib/engines/fuzzy';
import { formatUSD } from '@/lib/format';
import { signalLabels } from '../_lib/data';
import { useLang } from '../_lib/i18n';
import { Blank, ErrorBlank, PageHead, SkeletonRows, StateBar, useViewState } from '../_ui/parts';

const short = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-4)}`;
const displayDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

function HashLine({ label, hash }: { label: string; hash: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the short hash is still on screen.
    }
  };
  return (
    <div className="mf-offer-row" style={{ alignItems: 'center', padding: '4px 0', borderTop: 0 }}>
      <span className="mf-muted">{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span className="mf-mono mf-small">{short(hash)}</span>
        <button type="button" className="mf-link" aria-label={`Copy ${label}`} onClick={copy} style={{ minWidth: 44, textAlign: 'center' }}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        </button>
      </span>
    </div>
  );
}

interface Props {
  financed: InvoiceFacts;
  altered: InvoiceFacts;
  fingerprints: { registry: string; exact: string; altered: string };
  comparison: { signals: SimilaritySignal[]; score: number; flagged: boolean };
}

export function DuplicateView({ financed, altered, fingerprints, comparison }: Props) {
  const { t } = useLang();
  const { state, setState, retry } = useViewState();
  const [which, setWhich] = useState<'exact' | 'altered'>('exact');
  const [sent, setSent] = useState(false);

  const valueOf = (invoice: InvoiceFacts, key: SimilaritySignal['key']) => {
    if (key === 'invoiceNo') return invoice.invoiceNo;
    if (key === 'amount') return formatUSD(invoice.amount);
    if (key === 'date') return displayDate(invoice.date);
    if (key === 'currency') return invoice.currency;
    return invoice.irn ? short(invoice.irn) : '—';
  };

  return (
    <div className="mf-stack">
      <StateBar state={state} onChange={setState} />
      <PageHead title={t('dupTitle')} intro={t('dupIntro')} />

      {state === 'loading' && <SkeletonRows rows={4} label={t('checking')} />}
      {state === 'error' && <ErrorBlank message={t('dupError')} onRetry={retry} />}
      {state === 'empty' && (
        <Blank>
          <span className="mf-status mf-status-pass" style={{ marginBottom: 8 }}>
            <Check size={18} strokeWidth={2} aria-hidden="true" />
            {t('pass')}
          </span>
          <br />
          {t('dupEmpty')}
          <br />
          <span className="mf-small mf-muted">{t('dupEmptyNote')}</span>
        </Blank>
      )}

      {state === 'ready' && (
        <>
          <div className="mf-segment" role="group" aria-label={t('dupTitle')}>
            {(['exact', 'altered'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={which === value}
                onClick={() => {
                  setWhich(value);
                  setSent(false);
                }}
              >
                {t(value === 'exact' ? 'caseExact' : 'caseAltered')}
              </button>
            ))}
          </div>

          {which === 'exact' ? (
            <section className="mf-alert" role="alert">
              <div className="mf-alert-bar mf-alert-bar-fail">
                <OctagonX size={18} strokeWidth={2} aria-hidden="true" />
                {t('blockedHead')}
              </div>
              <div className="mf-alert-body mf-stack">
                <p style={{ margin: 0 }}>{t('blockedBody')}</p>
                <div>
                  <p className="mf-mono mf-small mf-bar" style={{ margin: '0 0 4px', gap: '0 12px' }}>
                    <span className="mf-nowrap">{financed.invoiceNo}</span>
                    <span className="mf-nowrap">{formatUSD(financed.amount)}</span>
                    <span className="mf-nowrap">{displayDate(financed.date)}</span>
                  </p>
                  <HashLine label={t('fpAttempt')} hash={fingerprints.exact} />
                  <HashLine label={t('fpRegistry')} hash={fingerprints.registry} />
                  {fingerprints.exact === fingerprints.registry && (
                    <span className="mf-status mf-status-fail">
                      <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                      {t('fpEqual')}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="mf-h2">{t('whatNext')}</h2>
                  <ul className="mf-list">
                    <li>{t('nextExact1')}</li>
                    <li>{t('nextExact2')}</li>
                  </ul>
                </div>
                <p className="mf-small mf-muted" style={{ margin: 0 }}>
                  {t('notShared')}
                </p>
                {sent ? (
                  <div className="mf-note mf-note-unknown" role="status">
                    {t('reviewSent')}
                  </div>
                ) : (
                  <div className="mf-bar">
                    <button type="button" className="mf-btn mf-btn-primary" onClick={() => setSent(true)}>
                      {t('askReview')}
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="mf-alert" role="alert">
              <div className="mf-alert-bar mf-alert-bar-warn">
                <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                {t('flaggedHead')}
              </div>
              <div className="mf-alert-body mf-stack">
                <p style={{ margin: 0 }}>{t('flaggedBody')}</p>
                <div className="mf-scroll">
                  <table className="mf-table mf-num">
                    <thead>
                      <tr>
                        <th scope="col">{t('signal')}</th>
                        <th scope="col">{t('yours')}</th>
                        <th scope="col">{t('financed')}</th>
                        <th scope="col" className="mf-right">{t('weight')}</th>
                        <th scope="col" className="mf-right">{t('points')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.signals.map((signal) => (
                        <tr key={signal.key}>
                          <th scope="row">{t(signalLabels[signal.key])}</th>
                          <td className="mf-mono">{valueOf(altered, signal.key)}</td>
                          <td className="mf-mono">{valueOf(financed, signal.key)}</td>
                          <td className="mf-right">{signal.weight.toFixed(2)}</td>
                          <td className="mf-right">{signal.points.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row" colSpan={4} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                          {t('overall')} · <span style={{ fontWeight: 400 }}>{t('threshold')}</span>
                        </th>
                        <td className="mf-right mf-money-lg">{comparison.score.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <HashLine label={t('fpAttempt')} hash={fingerprints.altered} />
                <p className="mf-small mf-muted" style={{ margin: 0 }}>
                  {t('notShared')}
                </p>
                {sent ? (
                  <div className="mf-note mf-note-unknown" role="status">
                    {t('reviewSent')}
                  </div>
                ) : (
                  <div className="mf-bar">
                    <button type="button" className="mf-btn mf-btn-primary" onClick={() => setSent(true)}>
                      {t('sendReview')}
                    </button>
                    <button type="button" className="mf-btn" onClick={() => setSent(true)}>
                      {t('explain')}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
