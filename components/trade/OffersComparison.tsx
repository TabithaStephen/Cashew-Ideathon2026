'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Calculator, Clock, Trophy, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { StatusChip } from '@/components/StatusChip';
import { useApi } from '@/lib/client';
import type { OfferItem, OffersRes } from '@/lib/client-types';
import { cn } from '@/lib/cn';
import { fmtDate, inr } from '@/lib/format';
import { AcceptSignModal } from './AcceptSignModal';

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;
const BADGE_ICON: Record<string, typeof Trophy> = { 'Lowest cost': Trophy, Fastest: Zap, 'Most cash upfront': Wallet };

function HiddenFeeChip({ amount }: { amount: number }) {
  const [tip, setTip] = useState(false);
  return (
    <span className="relative inline-block" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <button type="button" onFocus={() => setTip(true)} onBlur={() => setTip(false)} onClick={() => setTip(!tip)} aria-describedby="hidden-fee-tip"
        className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[11px] font-semibold bg-warn-soft text-warn border border-warn/30">
        <AlertTriangle size={11} strokeWidth={2.25} /> Hidden fee found
      </button>
      {tip && <span id="hidden-fee-tip" role="tooltip" className="absolute z-20 left-0 top-6 w-56 rounded-btn bg-ink text-white text-caption px-3 py-2 shadow-md">Stated in the conditions, not in the headline fees. +{inr(amount)}</span>}
    </span>
  );
}

function Calc({ it, V }: { it: OfferItem; V: number }) {
  const m = it.maths, o = it.offer;
  const L = (k: string, v: string, hl?: boolean) => <div className={cn('flex justify-between gap-3', hl && 'text-warn font-semibold')}><span>{k}</span><span className="tabular">{v}</span></div>;
  return (
    <div className="font-mono text-[11px] leading-5 bg-canvas border border-line rounded-btn p-3 text-ink-2 space-y-0.5 text-left">
      {L('V (invoice)', inr(V))}
      {L(`advance = V × ${pct(o.advancePct, 0)}`, inr(m.advance))}
      {L(`interest = adv × ${pct(o.ratePct, 1)} × ${o.tenureDays}/365`, inr(m.interest))}
      {m.fees.map((f, i) => <div key={i}>{L(`${f.label} ${f.kind === 'flat' ? '(flat)' : f.kind === 'pctAdvance' ? `= adv × ${pct(f.value)}` : `= V × ${pct(f.value)}`}`, `${inr(f.amount)}`, f.hidden)}</div>)}
      <div className="border-t border-line my-1" />
      {L('total cost = interest + fees', inr(m.totalCost))}
      {L(`effective = cost/adv × 365/${o.tenureDays}`, pct(m.effectiveAPR))}
      {L('net cash = advance − fees', inr(m.netCash))}
    </div>
  );
}

export function OffersComparison({ tradeId }: { tradeId: string }) {
  const [sort, setSort] = useState<'cost' | 'fastest' | 'cash'>('cost');
  const [showCalc, setShowCalc] = useState(false);
  const [accepting, setAccepting] = useState<OfferItem | null>(null);
  const reduce = useReducedMotion();
  const { data } = useApi<OffersRes>(`/api/trades/${tradeId}/offers?sort=${sort}`, 1000);
  if (!data) return <div className="h-96 skeleton rounded-card" />;
  const waiting = data.requests.filter((r) => r.eligible && r.status === 'requested' && !data.offers.some((o) => o.offer.lenderId === r.lenderId));
  const notSent = data.requests.filter((r) => !r.eligible);
  const accepted = data.acceptedOfferId;
  if (!data.requests.length && !data.offers.length) return <div className="bg-surface border border-line rounded-card"><EmptyState text="Offers appear here once you open the trade to lenders." /></div>;

  const cols = [...data.offers.map((o) => ({ kind: 'offer' as const, o })), ...waiting.map((r) => ({ kind: 'wait' as const, r }))];
  const rows: { label: string; render: (it: OfferItem) => React.ReactNode; strong?: boolean }[] = [
    { label: 'Advance %', render: (it) => pct(it.offer.advancePct, 0) },
    { label: 'Advance amount', render: (it) => inr(it.maths.advance) },
    { label: 'Headline rate (p.a.)', render: (it) => pct(it.offer.ratePct, 1) },
    { label: 'Effective annualised cost', strong: true, render: (it) => <span className="font-display text-[26px] leading-8">{pct(it.maths.effectiveAPR)}</span> },
    { label: 'Total fees', render: (it) => (
      <div className="space-y-1">
        <p className="font-semibold">{inr(it.maths.totalFees)}</p>
        {it.maths.fees.map((f, i) => (
          <div key={i} className={cn('text-caption flex flex-wrap items-center gap-1', f.hidden ? 'text-warn' : 'text-ink-3')}>
            <span>{f.label} {inr(f.amount)}</span>{f.hidden && <HiddenFeeChip amount={f.amount} />}
          </div>
        ))}
      </div>) },
    { label: 'Net cash to you', render: (it) => <span className="font-semibold">{inr(it.maths.netCash)}</span> },
    { label: 'Disbursal time', render: (it) => `${it.offer.disbursalHours} h` },
    { label: 'Recourse', render: (it) => it.offer.recourseLabel ?? (it.offer.recourse ? 'Recourse' : 'Non-recourse') },
    { label: 'Collateral', render: (it) => it.offer.collateral },
    { label: 'Conditions', render: (it) => <span className="text-caption text-ink-2 block max-w-[240px]">{it.offer.conditions}</span> },
    { label: 'Valid until', render: (it) => fmtDate(it.offer.validUntil) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-h3">Sealed offers</h3>
          <p className="text-caption text-ink-3">Normalised on invoice value {inr(data.valueInr)}. Lenders cannot see each other's offers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showCalc ? 'primary' : 'secondary'} compact icon={<Calculator size={14} />} onClick={() => setShowCalc(!showCalc)} disabled={!data.offers.length}>{showCalc ? 'Hide' : 'Show'} the calculation</Button>
          <div className="flex rounded-btn border border-line p-0.5 bg-surface" role="radiogroup" aria-label="Sort offers">
            {([['cost', 'Lowest cost'], ['fastest', 'Fastest'], ['cash', 'Most cash']] as const).map(([k, l]) => (
              <button key={k} role="radio" aria-checked={sort === k} onClick={() => setSort(k)} className={cn('h-8 px-3 rounded-[8px] text-[13px] font-medium', sort === k ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink')}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-card shadow-sm overflow-x-auto">
        <table className="w-full text-table min-w-[760px]">
          <thead>
            <tr className="border-b border-line align-top">
              <th className="w-[180px] text-left p-4 text-caption font-medium text-ink-3">{cols.length} lender{cols.length === 1 ? '' : 's'}</th>
              <AnimatePresence initial={false}>
                {cols.map((c, i) => c.kind === 'offer' ? (
                  <motion.th key={c.o.offer.id} layout={!reduce} initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.12 }}
                    className={cn('text-left p-4 font-normal min-w-[200px]', accepted === c.o.offer.id && 'bg-brand-soft')}>
                    <p className="text-sm font-semibold">{c.o.lender}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5 min-h-[24px]">
                      {c.o.badges.map((b) => { const I = BADGE_ICON[b]; return <span key={b} className="inline-flex items-center gap-1 rounded-full px-2 h-6 text-caption font-medium bg-brand-soft text-brand"><I size={12} />{b}</span>; })}
                      {accepted === c.o.offer.id && <StatusChip variant="pass" label="Accepted" />}
                    </div>
                  </motion.th>
                ) : (
                  <th key={c.r.id} className="text-left p-4 font-normal min-w-[200px]">
                    <p className="text-sm text-ink-2 flex items-center gap-1.5"><Clock size={14} className="animate-pulse" /> Waiting for {c.r.lender}…</p>
                  </th>
                ))}
              </AnimatePresence>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={cn('border-b border-line last:border-b-0 align-top', r.strong && 'bg-canvas/60')}>
                <td className={cn('p-4 text-ink-2', r.strong && 'font-semibold text-ink')}>{r.label}</td>
                {cols.map((c) => c.kind === 'offer'
                  ? <td key={c.o.offer.id} className={cn('p-4 tabular', accepted === c.o.offer.id && 'bg-brand-soft/60')}>{r.render(c.o)}</td>
                  : <td key={c.r.id} className="p-4"><div className="h-4 w-24 skeleton rounded" /></td>)}
              </tr>
            ))}
            {showCalc && (
              <tr className="border-t border-line align-top"><td className="p-4 text-ink-2 font-semibold">The calculation</td>
                {cols.map((c) => <td key={c.kind === 'offer' ? c.o.offer.id : c.r.id} className="p-4">{c.kind === 'offer' && <Calc it={c.o} V={data.valueInr} />}</td>)}</tr>
            )}
            <tr className="border-t border-line"><td className="p-4" />
              {cols.map((c) => c.kind === 'offer'
                ? <td key={c.o.offer.id} className="p-4">{accepted === c.o.offer.id
                    ? <Button compact variant="secondary" onClick={() => setAccepting(c.o)}>{data.status === 'OFFER_ACCEPTED' ? 'Sign with OTP' : 'View terms'}</Button>
                    : <Button compact disabled={!!accepted || data.status !== 'OFFERS_OPEN'} onClick={() => setAccepting(c.o)}>Accept this offer</Button>}</td>
                : <td key={c.r.id} className="p-4" />)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-caption text-ink-2 text-center">Offers are ranked by what they cost you, never by what lenders pay Cashew.</p>
      {notSent.length > 0 && (
        <div className="text-caption text-ink-3">{notSent.map((r) => <p key={r.id}>Not sent to {r.lender}: {r.reasons.join('; ')}.</p>)}</div>
      )}
      <AcceptSignModal item={accepting} tradeId={tradeId} status={data.status} onClose={() => setAccepting(null)} valueInr={data.valueInr} />
    </div>
  );
}
