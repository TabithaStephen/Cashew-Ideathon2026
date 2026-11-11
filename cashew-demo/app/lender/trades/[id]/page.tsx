'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/Button';
import { HashPill } from '@/components/HashPill';
import { DocumentsView } from '@/components/app/DocumentsView';
import { TransactionFlow } from '@/components/app/TransactionFlow';
import { Calculation } from '@/components/app/Offers';
import { Callout, KeyValues, PageHead, Rows, TradeStatusChip, TradeValue } from '@/components/app/parts';
import { VerificationList } from '@/components/app/Verification';
import { api, useAction, useApi, ClientApiError, refreshAll } from '@/lib/client/api';
import { normaliseStoredOffer } from '@/lib/engines/matching';
import { COMPONENT_NAMES, computeRisk } from '@/lib/engines/risk';
import { formatINR } from '@/lib/format';
import { formatDateTime } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { CheckResult, Fee } from '@/lib/types';

function StrengthCard({ trade, bundle }: { trade: any; bundle: any }) {
  const [weights, setWeights] = useState([1, 1, 1, 1]);
  // The same pure engine as the server, so a slider recomputes in the same frame.
  const risk = useMemo(() => {
    const results: Record<number, CheckResult> = {};
    for (const check of bundle?.checks ?? []) if (check.result) results[check.checkId] = check.result;
    return computeRisk(trade.id, results, trade.paymentTermsDays, weights);
  }, [bundle, trade.id, trade.paymentTermsDays, weights]);
  const tone = risk.band === 'Strong' ? 'text-pass' : risk.band === 'Moderate' ? 'text-warn' : 'text-fail';
  const chart = COMPONENT_NAMES.map((name) => ({ name, value: risk.components[name] }));

  return (
    <section data-tour="strength" className="panel p-4">
      <h2 className="mb-1">Evidence strength</h2>
      <p className={cn('tabular text-money', tone)} data-testid="strength">{risk.band} <span className="text-ink-2">{risk.strength.toFixed(1)} of 100</span></p>
      <p className="text-table text-ink-2">Risk band: {risk.riskBand}. Rules {risk.ruleVersion}.</p>
      {risk.blocking.length > 0 && <div className="mt-2"><Callout tone="fail" title="Blocking issue">Check {risk.blocking.join(', ')} failed, so the band is capped at Limited.</Callout></div>}
      <div className="mt-3 h-40" role="img" aria-label={chart.map((c) => `${c.name} ${c.value}%`).join(', ')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} layout="vertical" margin={{ left: 0, right: 44, top: 0, bottom: 0 }} barCategoryGap={8}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" width={148} tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: 'var(--ink)' }} />
            <Bar dataKey="value" isAnimationActive={false} label={{ position: 'right', fontSize: 13, fill: 'var(--ink)' }}>
              {chart.map((row) => <Cell key={row.name} fill="var(--ink)" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {COMPONENT_NAMES.map((name, i) => (
          <label key={name} className="grid grid-cols-[minmax(0,1fr)_120px_32px] items-center gap-2 text-table">
            <span>{name}</span>
            <input type="range" min={0} max={2} step={0.1} value={weights[i]} aria-label={`Weight for ${name}`} className="min-h-7 accent-[var(--ink)]" onChange={(e) => setWeights(weights.map((w, j) => (j === i ? Number(e.target.value) : w)))} />
            <span className="tabular text-right">{weights[i].toFixed(1)}</span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-table text-ink-2">Each lender sets its own weights. Cashew supplies evidence, you decide.</p>
    </section>
  );
}

const EMPTY_FORM = { advancePct: '', ratePct: '', tenureDays: '', processingPct: '', fees: [] as Fee[], recourse: true, collateral: 'None', conditions: '', validityDays: '7', disbursalHours: '48' };

function OfferForm({ trade }: { trade: any }) {
  const { data: productData } = useApi<any>('lender/products', 0);
  const { data: own } = useApi<any>(`trades/${trade.id}/offers`, 1000);
  const { run, busy } = useAction();
  const [form, setForm] = useState({ ...EMPTY_FORM, tenureDays: String(trade.paymentTermsDays) });
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const product = productData?.products[0];

  const defaults = () => {
    if (!product) return;
    const { pricing } = product;
    const processing = pricing.fees.find((f: Fee) => f.label === 'Processing fee');
    setForm({
      advancePct: String(pricing.advancePct), ratePct: String(pricing.ratePct), tenureDays: String(trade.paymentTermsDays), processingPct: String(processing?.value ?? 0),
      fees: pricing.fees.filter((f: Fee) => f !== processing), recourse: pricing.recourse, collateral: pricing.collateral, conditions: pricing.conditions, validityDays: String(pricing.validityDays), disbursalHours: String(pricing.disbursalHours),
    });
  };

  const fees: Fee[] = [...(Number(form.processingPct) > 0 ? [{ label: 'Processing fee', kind: 'pctAdvance' as const, value: Number(form.processingPct), statedIn: 'headline' as const }] : []), ...form.fees];
  const valid = Number(form.advancePct) > 0 && Number(form.ratePct) >= 0 && form.ratePct !== '' && Number(form.tenureDays) > 0;
  const preview = valid ? normaliseStoredOffer({ advancePct: Number(form.advancePct), ratePct: Number(form.ratePct), tenureDays: Number(form.tenureDays), fees, conditions: form.conditions }, trade.valueInr) : undefined;
  const sent = own?.offers[0];

  const submit = () => run(() => api('offers', { body: { tradeId: trade.id, productName: product?.name ?? 'Offer', advancePct: Number(form.advancePct), ratePct: Number(form.ratePct), tenureDays: Number(form.tenureDays), fees, recourse: form.recourse, collateral: form.collateral, conditions: form.conditions, disbursalHours: Number(form.disbursalHours), validityDays: Number(form.validityDays) } }));
  const decline = () => run(() => api(`trades/${trade.id}/decline`, { method: 'POST' }));
  const open = trade.status === 'OFFERS_OPEN';

  const number = (label: string, key: 'advancePct' | 'ratePct' | 'tenureDays' | 'processingPct' | 'validityDays' | 'disbursalHours') => (
    <label className="block">
      <span className="field-label mb-1 block">{label}</span>
      <input className="input tabular" inputMode="decimal" value={form[key]} disabled={!open} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Offer</h2>
        {open && <Button size="compact" onClick={defaults}>Use my product defaults</Button>}
      </div>
      {sent && <Callout tone="pass" title="Offer sent. You can’t see other lenders’ offers."><span className="tabular">Your offer: {sent.advancePct}% advance at {sent.ratePct}% p.a., effective cost {sent.effectiveApr.toFixed(2)}%.</span></Callout>}
      {trade.offerStatus === 'Declined' && <Callout tone="unknown" title="You declined this trade." />}
      {!open && !sent && <p className="text-ink-2">This trade isn’t open for offers.</p>}
      {open && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {number('Advance %', 'advancePct')}
            {number('Headline rate % p.a.', 'ratePct')}
            {number('Tenure (days)', 'tenureDays')}
            {number('Processing fee %', 'processingPct')}
            {number('Disbursal (hours)', 'disbursalHours')}
            {number('Valid for (days)', 'validityDays')}
          </div>
          <div>
            <p className="field-label mb-1">Other fees</p>
            <div className="flex flex-col gap-2">
              {form.fees.map((fee, i) => {
                const change = (patch: Partial<Fee>) => set('fees', form.fees.map((f, j) => (j === i ? { ...f, ...patch } : f)));
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 border border-rule p-2">
                    <label className="col-span-2"><span className="sr-only">Fee name</span><input className="input" value={fee.label} placeholder="Fee name" onChange={(e) => change({ label: e.target.value })} /></label>
                    <label><span className="sr-only">Fee amount</span><input className="input tabular" inputMode="decimal" value={fee.value} onChange={(e) => change({ value: Number(e.target.value) || 0 })} /></label>
                    <label>
                      <span className="sr-only">Fee type</span>
                      <select className="input" value={fee.kind} onChange={(e) => change({ kind: e.target.value as Fee['kind'] })}>
                        <option value="pctAdvance">% of advance</option>
                        <option value="pctInvoice">% of invoice</option>
                        <option value="flat">Flat ₹</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label mb-1 block">Stated in</span>
                      <select className="input" value={fee.statedIn} onChange={(e) => change({ statedIn: e.target.value as Fee['statedIn'] })}>
                        <option value="headline">Headline</option>
                        <option value="conditions">Conditions</option>
                      </select>
                    </label>
                    <div className="self-end"><Button variant="ghost" onClick={() => set('fees', form.fees.filter((_, j) => j !== i))}>Remove</Button></div>
                  </div>
                );
              })}
              <div><Button size="compact" onClick={() => set('fees', [...form.fees, { label: '', kind: 'flat', value: 0, statedIn: 'headline' }])}>Add a fee</Button></div>
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" role="switch" className="size-5" checked={form.recourse} onChange={(e) => set('recourse', e.target.checked)} />
            With recourse
          </label>
          <label className="block"><span className="field-label mb-1 block">Collateral</span><input className="input" value={form.collateral} onChange={(e) => set('collateral', e.target.value)} /></label>
          <label className="block"><span className="field-label mb-1 block">Conditions</span><textarea className="input" rows={2} value={form.conditions} onChange={(e) => set('conditions', e.target.value)} /></label>
          <div className="border border-rule bg-paper p-3" aria-live="polite">
            <p className="field-label">What the exporter will see</p>
            {preview ? (
              <>
                <p className="tabular text-money">{preview.effectiveApr.toFixed(2)}% effective cost</p>
                <p className="tabular text-table text-ink-2">Net cash {formatINR(preview.netCash)}. Total cost {formatINR(preview.totalCost)}.</p>
                {preview.feeLines.some((f) => f.hidden) && <p className="text-table font-semibold text-warn">A fee stated only in the conditions will be shown as a hidden fee.</p>}
              </>
            ) : <p className="text-table text-ink-2">Enter an advance, rate and tenure.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={!valid} loading={busy} onClick={submit}>{sent ? 'Replace sealed offer' : 'Submit sealed offer'}</Button>
            {!sent && <Button variant="ghost" onClick={decline}>Decline to offer</Button>}
          </div>
        </>
      )}
      {sent?.feeLines && <details><summary className="min-h-7 cursor-pointer text-table underline underline-offset-4">Show the calculation</summary><div className="mt-2"><Calculation offer={sent} /></div></details>}
    </section>
  );
}

function CommitCard({ trade }: { trade: any }) {
  const { run, busy } = useAction();
  const [blocked, setBlocked] = useState<string>();
  const commit = async () => {
    await run(async () => {
      try {
        await api('registry/commit', { body: { tradeId: trade.id } });
      } catch (e) {
        if ((e as ClientApiError).code === 'REGISTRY_BLOCKED') {
          setBlocked((e as Error).message);
          refreshAll();
          return;
        }
        throw e;
      }
    });
  };
  const message = blocked ?? (trade.commitBlocked ? 'This invoice has already been financed through Cashew. Details of the other lender are not shared.' : undefined);
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <h2>Commit financing</h2>
      {trade.commit ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-semibold text-pass">Committed to the registry.</p>
          <HashPill hash={trade.commit.entryHash} label="registry receipt" />
          <p className="tabular text-table text-ink-2">Chain position {trade.commit.position}, {formatDateTime(trade.commit.timestamp)}</p>
        </div>
      ) : message ? (
        <Callout tone="fail" title="Commit blocked by the registry.">{message}</Callout>
      ) : (
        <>
          <p className="text-table text-ink-2">Checks the registry first, then appends this financing to the chain.</p>
          <div><Button variant="primary" loading={busy} onClick={commit}>Commit financing</Button></div>
        </>
      )}
    </section>
  );
}

export default function LenderTrade({ params }: { params: { id: string } }) {
  const { data: trade, error } = useApi<any>(`trades/${params.id}`, 1000);
  const { data: bundle } = useApi<any>(`trades/${params.id}/evidence`, 1000);
  if (error && !trade) {
    return (
      <div role="alert" className="panel flex flex-col items-start gap-3 p-6">
        <p>{error.message}</p>
        <Button asChild><Link href="/lender">Back to inbox</Link></Button>
      </div>
    );
  }
  if (!trade) return <Rows count={6} />;
  return (
    <>
      <PageHead title={`${trade.smeName} to ${trade.buyerName}`} intro={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-mono text-label">{trade.id}</span><TradeValue value={trade.value} fx={trade.fx} /><TradeStatusChip status={trade.status} /></span>} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="panel p-4">
            <h2 className="mb-2">Trade</h2>
            <KeyValues rows={[['Invoice', trade.invoiceNo ?? '—'], ['Goods', trade.goods], ['Corridor', trade.corridor], ['Terms', `${trade.incoterm}, ${trade.paymentTermsDays} days`], ['Shipment', ['Not yet loaded', 'Loaded', 'Sailed', 'Arrived', 'Delivered'][trade.shipmentStage]], ['Flagged by exporter', trade.flaggedUnknownOrFailed.length ? `Checks ${trade.flaggedUnknownOrFailed.join(', ')}` : 'None']]} />
          </section>
          {trade.acceptedOffer && <TransactionFlow trade={trade} narrow />}
          <section>
            <h2 className="mb-2">Fourteen checks</h2>
            <VerificationList bundle={bundle} />
          </section>
          <section>
            <h2 className="mb-2">Documents</h2>
            <DocumentsView docs={trade.docs} />
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <StrengthCard trade={trade} bundle={bundle} />
          {trade.tab === 'Financed' ? <CommitCard trade={trade} /> : <OfferForm trade={trade} />}
        </div>
      </div>
    </>
  );
}
