'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { steps, trade, type StepState } from '../_lib/data';
import { useLang } from '../_lib/i18n';
import { Blank, ErrorBlank, PageHead, SkeletonRows, StateBar, TradeTag, useViewState } from '../_ui/parts';

const DELIVERED = steps.findIndex((step) => step.key === 'delivered');

export default function TrackingPage() {
  const { t, lang } = useLang();
  const { state, setState, retry } = useViewState();
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  const currentIndex = confirmedAt ? DELIVERED + 1 : DELIVERED;
  const stateOf = (i: number): StepState => (i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming');

  const confirm = () => {
    const now = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
    }).format(new Date());
    setConfirmedAt(`${now} IST`);
  };

  return (
    <div className="mf-stack">
      <StateBar state={state} onChange={setState} />
      <PageHead title={t('trackTitle')} intro={t('trackIntro')} />
      <TradeTag amended />

      {state === 'loading' && <SkeletonRows rows={6} label={t('stateLoading')} />}
      {state === 'error' && <ErrorBlank message={t('trackError')} onRetry={retry} />}
      {state === 'empty' && (
        <Blank action={<Link className="mf-btn" href="/proto/offers">{t('trackEmptyAction')}</Link>}>
          {t('trackEmpty')}
        </Blank>
      )}

      {state === 'ready' && (
        <div className="mf-track">
          <ol className="mf-time">
            {steps.map((step, i) => {
              const s = stateOf(i);
              const isDelivered = step.key === 'delivered';
              const by = isDelivered && confirmedAt ? trade.exporter : step.by;
              const at = isDelivered && confirmedAt ? confirmedAt : step.at;
              return (
                <li key={step.key} data-state={s} aria-current={s === 'current' ? 'step' : undefined}>
                  <span className="mf-dot">{s === 'done' && <Check size={14} strokeWidth={3} aria-hidden="true" />}</span>
                  <div className="mf-time-title">{step.title[lang]}</div>
                  {at ? (
                    <div className="mf-small mf-muted mf-num" lang="en">
                      {at}
                    </div>
                  ) : (
                    <div className="mf-small mf-muted">{t('notYet')}</div>
                  )}
                  {by && (
                    <div className="mf-small mf-muted">
                      {t('confirmedBy')} <span lang="en">{by}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <aside className="mf-stack" style={{ gap: 12 }}>
            <div className="mf-note">
              <p className="mf-label" style={{ margin: '0 0 4px' }}>
                {t('nextStep')}
              </p>
              <p style={{ margin: 0 }}>{confirmedAt ? t('nextPayment') : t('nextDelivered')}</p>
            </div>
            <dl className="mf-kv mf-small" style={{ padding: '0 4px' }}>
              <dt className="mf-label">{t('route')}</dt>
              <dd className="mf-mono">{trade.route}</dd>
              <dt className="mf-label">{t('exporter')}</dt>
              <dd lang="en">{trade.exporter}</dd>
            </dl>
            {!confirmedAt && (
              <div className="mf-sticky">
                <button type="button" className="mf-btn mf-btn-primary" onClick={confirm}>
                  {t('confirmDelivered')}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
