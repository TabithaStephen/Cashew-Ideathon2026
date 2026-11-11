'use client';

import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normaliseOffer, type NormalisedOffer } from '@/lib/engines/matching';
import { formatINR } from '@/lib/format';
import { INVOICE_VALUE_INR, offers, type SampleOffer } from '../_lib/data';
import { useLang } from '../_lib/i18n';
import type { StringKey } from '../_lib/strings';
import { Blank, ErrorBlank, PageHead, StateBar, TradeTag, useViewState } from '../_ui/parts';

type Sort = 'cost' | 'speed' | 'cash';
const SORTS: Array<[Sort, StringKey]> = [
  ['cost', 'sortCost'],
  ['speed', 'sortSpeed'],
  ['cash', 'sortCash'],
];

interface Row {
  offer: SampleOffer;
  n: NormalisedOffer;
}

const pct = (value: number) => `${value.toFixed(2)}%`;

function calcText(row: Row): string {
  const { offer, n } = row;
  const lines = [
    `Advance   ${formatINR(INVOICE_VALUE_INR)} × ${offer.advancePct}% = ${formatINR(n.advance)}`,
    `Interest  ${formatINR(n.advance)} × ${offer.ratePct}% × ${offer.tenureDays}/365 = ${formatINR(n.interest)}`,
    ...n.feeLines.map((fee) => `Fee       ${fee.label} = ${formatINR(fee.amount)}${fee.hidden ? '  (conditions only)' : ''}`),
    `Total     ${formatINR(n.totalCost)}`,
    `Annual    ${formatINR(n.totalCost)} ÷ ${formatINR(n.advance)} × 365/${offer.tenureDays} = ${pct(n.effectiveApr)}`,
    `Net cash  ${formatINR(n.advance)} − ${formatINR(n.totalFees)} = ${formatINR(n.netCash)}`,
    '',
    'Lines are rounded to the rupee. Totals use exact values.',
  ];
  return lines.join('\n');
}

function HiddenFees({ row }: { row: Row }) {
  const { t } = useLang();
  const hidden = row.n.feeLines.filter((fee) => fee.hidden);
  if (hidden.length === 0) return null;
  return (
    <div className="mf-stack" style={{ gap: 4 }}>
      <span className="mf-chip mf-chip-warn">
        <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
        {t('hiddenFee')}
      </span>
      {hidden.map((fee) => (
        <span key={fee.label} className="mf-small mf-num">
          {fee.label}: +{formatINR(fee.amount)}. {t('hiddenFeeNote')}.
        </span>
      ))}
    </div>
  );
}

function Calc({ row }: { row: Row }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="mf-link" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t('hideCalc') : t('showCalc')}
      </button>
      {open && <pre className="mf-calc mf-mono">{calcText(row)}</pre>}
    </div>
  );
}

function useBadges(rows: Row[]) {
  return useMemo(() => {
    const best = (score: (r: Row) => number) =>
      rows.reduce((top, r) => (score(r) < score(top) ? r : top), rows[0]).offer.id;
    return {
      badgeCost: best((r) => r.n.effectiveApr),
      badgeSpeed: best((r) => r.offer.disbursalHours),
      badgeCash: best((r) => -r.n.netCash),
    } as Partial<Record<StringKey, string>>;
  }, [rows]);
}

function Badges({ id, badges }: { id: string; badges: Partial<Record<StringKey, string>> }) {
  const { t } = useLang();
  const keys = (Object.keys(badges) as StringKey[]).filter((key) => badges[key] === id);
  if (keys.length === 0) return null;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {keys.map((key) => (
        <span key={key} className="mf-chip mf-chip-plain">
          {t(key)}
        </span>
      ))}
    </span>
  );
}

export default function OffersPage() {
  const { t } = useLang();
  const { state, setState, retry } = useViewState();
  const [sort, setSort] = useState<Sort>('cost');
  const [accepted, setAccepted] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const all = offers.map((offer) => ({
      offer,
      n: normaliseOffer({
        invoiceValue: INVOICE_VALUE_INR,
        advancePct: offer.advancePct,
        ratePct: offer.ratePct,
        tenureDays: offer.tenureDays,
        fees: offer.fees,
      }),
    }));
    const key: Record<Sort, (r: Row) => number> = {
      cost: (r) => r.n.effectiveApr,
      speed: (r) => r.offer.disbursalHours,
      cash: (r) => -r.n.netCash,
    };
    return all.sort((a, b) => key[sort](a) - key[sort](b));
  }, [sort]);
  const badges = useBadges(rows);

  const table: Array<[StringKey, (r: Row) => React.ReactNode, boolean?]> = [
    ['effectiveCost', (r) => <span className="mf-money-lg">{pct(r.n.effectiveApr)}</span>, true],
    ['headlineRate', (r) => `${r.offer.ratePct}%`],
    ['advance', (r) => `${r.offer.advancePct}%`],
    ['advanceAmount', (r) => formatINR(r.n.advance)],
    ['totalFees', (r) => formatINR(r.n.totalFees)],
    ['totalCost', (r) => formatINR(r.n.totalCost)],
    ['netCash', (r) => formatINR(r.n.netCash)],
    ['disbursal', (r) => `${r.offer.disbursalHours} ${t('hours')}`],
    ['recourse', (r) => r.offer.recourse],
    ['collateral', (r) => r.offer.collateral],
    ['validFor', (r) => `${r.offer.validDays} ${t('days')}`],
  ];

  return (
    <div className="mf-stack">
      <StateBar state={state} onChange={setState} />
      <PageHead title={t('offersTitle')} intro={t('offersIntro')} />
      <TradeTag amended />

      {state === 'loading' && (
        <div className="mf-ledger" role="status" aria-label={t('stateLoading')}>
          {['Tidewater Finance', 'Banyan Capital', 'Meridian Bank'].map((name) => (
            <div key={name} className="mf-offer-row">
              <span className="mf-muted">
                {t('waitingFor')} {name}
              </span>
              <span className="mf-skel" style={{ width: 96 }} />
            </div>
          ))}
        </div>
      )}
      {state === 'error' && <ErrorBlank message={t('offersError')} onRetry={retry} />}
      {state === 'empty' && (
        <Blank action={<button type="button" className="mf-btn mf-btn-primary">{t('offersEmptyAction')}</button>}>
          {t('offersEmpty')}
        </Blank>
      )}

      {state === 'ready' && (
        <>
          <div className="mf-segment" role="group" aria-label={t('sortBy')}>
            <span className="mf-label">{t('sortBy')}</span>
            {SORTS.map(([value, key]) => (
              <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)}>
                {t(key)}
              </button>
            ))}
          </div>

          {accepted && (
            <div className="mf-note mf-note-pass" role="status">
              {offers.find((o) => o.id === accepted)?.lender}: {t('accepted')}
            </div>
          )}

          <div className="mf-offertable mf-scroll">
            <table className="mf-table mf-num">
              <thead>
                <tr>
                  <td />
                  {rows.map((r) => (
                    <th key={r.offer.id} scope="col">
                      <span className="mf-offer-head">
                        <span className="mf-h2">{r.offer.lender}</span>
                        <span className="mf-small mf-muted" style={{ fontWeight: 400 }}>
                          {r.offer.product}
                        </span>
                        <Badges id={r.offer.id} badges={badges} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{t(key)}</th>
                    {rows.map((r) => (
                      <td key={r.offer.id}>{value(r)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">{t('conditions')}</th>
                  {rows.map((r) => (
                    <td key={r.offer.id}>
                      <div className="mf-stack" style={{ gap: 8 }}>
                        <span lang="en">{r.offer.conditions}</span>
                        <HiddenFees row={r} />
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  {rows.map((r) => (
                    <td key={r.offer.id}>
                      <button type="button" className="mf-btn mf-btn-primary" onClick={() => setAccepted(r.offer.id)}>
                        {t('accept')}
                      </button>
                      <Calc row={r} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mf-offercards">
            {rows.map((r) => (
              <article key={r.offer.id} className="mf-offer-card">
                <div className="mf-offer-head">
                  <span className="mf-h2">{r.offer.lender}</span>
                  <span className="mf-small mf-muted">{r.offer.product}</span>
                  <Badges id={r.offer.id} badges={badges} />
                </div>
                {table.map(([key, value]) => (
                  <div className="mf-offer-row mf-num" key={key}>
                    <span className="mf-muted">{t(key)}</span>
                    <span>{value(r)}</span>
                  </div>
                ))}
                <div className="mf-stack" style={{ gap: 8, borderTop: '1px solid var(--rule)' }}>
                  <span className="mf-label">{t('conditions')}</span>
                  <span lang="en">{r.offer.conditions}</span>
                  <HiddenFees row={r} />
                  <Calc row={r} />
                  <button type="button" className="mf-btn mf-btn-primary" onClick={() => setAccepted(r.offer.id)}>
                    {t('accept')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
