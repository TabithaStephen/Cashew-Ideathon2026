'use client';
import { CheckCircle2, Lock, Plus, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, LabelList } from 'recharts';
import { Button } from '@/components/Button';
import { Card, CardHeader, Skeleton } from '@/components/Card';
import { DocSlot } from '@/components/DocSlot';
import { EmptyState } from '@/components/EmptyState';
import { Input, Label, Select, Textarea } from '@/components/Field';
import { HashPill } from '@/components/HashPill';
import { StatusChip, TradeStatusChip } from '@/components/StatusChip';
import { Timeline } from '@/components/Timeline';
import { DocDetailDrawer } from '@/components/trade/DocDetailDrawer';
import { bandVariant } from '@/components/trade/EvidenceStrength';
import { VerificationPanel } from '@/components/trade/VerificationPanel';
import { api, useApi } from '@/lib/client';
import type { OffersRes, Workspace } from '@/lib/client-types';
import { COMPONENTS } from '@/lib/engines/risk';
import { computeOffer } from '@/lib/engines/matching';
import { exportValue, fmtDateTime, inr } from '@/lib/format';
import { useToken } from '@/lib/use-token';
import { DOC_LABELS, DOC_TYPES, SHIPMENT_STAGES, type DocType, type Fee, type LenderProduct, type Offer, type RiskProfile } from '@/lib/types';

export default function LenderTrade() {
  const { id } = useParams<{ id: string }>();
  const { data: ws, error } = useApi<Workspace>(`/api/trades/${id}`, 1500);
  const [doc, setDoc] = useState<DocType | null>(null);
  if (error) return <Card><EmptyState text={error.code === 'CONSENT_REQUIRED' ? 'The exporter has not shared this trade with you, or revoked consent.' : error.message} action={<Link href="/lender"><Button>Back to inbox</Button></Link>} /></Card>;
  if (!ws) return <Skeleton className="h-96" />;
  const t = ws.trade;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><div className="flex items-center gap-2"><HashPill value={t.id} full label="Trade ID" /><TradeStatusChip status={t.status} /></div>
          <h1 className="mt-2">{ws.org.legalName}</h1><p className="text-ink-2 tabular">{ws.buyer.name} · {exportValue(t.value, t.fx)} · {t.paymentTermsDays} days · {t.corridor}</p></div>
        {ws.myConsent && <p className="text-caption text-ink-3 text-right">Shared with you under consent <span className="font-mono">{ws.myConsent.id}</span><br />until {fmtDateTime(ws.myConsent.expiresAt)}</p>}
      </div>
      <div className="grid xl:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div><h3 className="text-h3 mb-3">Fourteen checks</h3><VerificationPanel tradeId={t.id} role="lender" showRun={false} /></div>
          <Card>
            <CardHeader title="Documents" subtitle="Extracted fields, exactly as the exporter's checks used them" />
            <div className="grid sm:grid-cols-2 gap-3">{DOC_TYPES.map((d) => { const x = ws.docs[d]; return <DocSlot key={d} label={DOC_LABELS[d]} state={x ? 'extracted' : 'empty'} fieldCount={x ? Object.keys(x.extracted.fields).length : 0} fileName={x?.fileName} version={x?.version} amended={x?.amended} onOpen={() => setDoc(d)} disabled />; })}</div>
          </Card>
          <Card><CardHeader title="Shipment status" subtitle="Carrier feed simulated" /><Timeline steps={SHIPMENT_STAGES} current={(t.shipmentStage ?? 0) >= 4 ? 5 : t.shipmentStage ?? 0} /></Card>
        </div>
        <div className="space-y-6">
          <StrengthCard tradeId={t.id} />
          <OfferPanel ws={ws} />
        </div>
      </div>
      <DocDetailDrawer doc={doc ? ws.docs[doc] ?? null : null} onClose={() => setDoc(null)} />
    </div>
  );
}

function StrengthCard({ tradeId }: { tradeId: string }) {
  const [w, setW] = useState([1, 1, 1, 1]);
  const { data: risk } = useApi<RiskProfile>(`/api/trades/${tradeId}/risk-profile?w=${w.join(',')}`, 3000);
  const [shown, setShown] = useState<RiskProfile | undefined>();
  useEffect(() => { if (risk) setShown(risk); }, [risk]);
  const colors = { success: useToken('success'), warn: useToken('warn'), danger: useToken('danger'), ink3: useToken('ink-3'), line: useToken('line') };
  const r = shown;
  const chart = r ? COMPONENTS.map((c) => ({ name: c.label, pct: Math.round((r.components[c.key] / c.max) * 100) })) : [];
  return (
    <Card>
      <CardHeader title="Evidence strength" subtitle="Risk profile computed from the 14 checks" right={r && <StatusChip variant={bandVariant(r.band)} label={`${r.band} · ${r.riskBand} risk`} />} />
      {!r ? <Skeleton className="h-40" /> : (
        <>
          <p className="font-display text-[44px] leading-none tabular">{r.strength.toFixed(1)}<span className="text-h3 text-ink-3"> / 100</span></p>
          {r.blocking.length > 0 && <p className="mt-3 text-table text-danger bg-danger-soft rounded-btn px-3 py-2 flex items-center gap-2"><ShieldX size={16} />Blocking issue: check {r.blocking.join(', ')} failed. Band capped at Limited.</p>}
          <div className="h-[150px] mt-4 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 0, right: 36, top: 0, bottom: 0 }} barSize={14}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" width={160} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: colors.ink3 }} />
                <Bar dataKey="pct" radius={[0, 7, 7, 0]} isAnimationActive={false} background={{ fill: colors.line, radius: 7 }}>
                  {chart.map((d) => <Cell key={d.name} fill={d.pct >= 80 ? colors.success : d.pct >= 60 ? colors.warn : colors.danger} />)}
                  <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: colors.ink3 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {COMPONENTS.map((c, i) => (
              <div key={c.key} className="grid grid-cols-[150px_1fr_36px] items-center gap-3">
                <label htmlFor={`w${i}`} className="text-caption text-ink-2">{c.label} weight</label>
                <input id={`w${i}`} type="range" min={0} max={2} step={0.1} value={w[i]} onChange={(e) => setW(w.map((x, j) => (j === i ? Number(e.target.value) : x)))} className="accent-[rgb(var(--c-brand))]" />
                <span className="text-caption tabular text-right">{w[i].toFixed(1)}×</span>
              </div>
            ))}
          </div>
          <p className="text-caption text-ink-3 mt-3">Each lender sets its own weights. Cashew supplies evidence, you decide. Rules {r.ruleVersion}.</p>
        </>
      )}
    </Card>
  );
}

interface FeeRow { label: string; kind: Fee['kind']; value: string; statedIn: Fee['statedIn'] }

function OfferPanel({ ws }: { ws: Workspace }) {
  const t = ws.trade;
  const products = useApi<LenderProduct[]>('/api/lender/products');
  const offers = useApi<OffersRes>(`/api/trades/${t.id}/offers`, 1500);
  const mine = offers.data?.offers[0];
  const product = products.data?.[0];
  const [f, setF] = useState({ advancePct: '', ratePct: '', tenureDays: String(t.paymentTermsDays), processingPct: '', recourse: true, collateral: 'None', conditions: '', validDays: '7', disbursalHours: '48' });
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const defaults = () => {
    if (!product) return;
    const p = product.pricing;
    setF({ advancePct: String(p.advancePct * 100), ratePct: String(+(p.ratePct * 100).toFixed(2)), tenureDays: String(t.paymentTermsDays), processingPct: String(+(p.processingPct * 100).toFixed(3)), recourse: p.recourse, collateral: p.collateral, conditions: p.conditions, validDays: String(p.validDays), disbursalHours: String(p.disbursalHours) });
    setFees(p.extraFees.map((x) => ({ label: x.label, kind: x.kind, value: String(x.kind === 'flat' ? x.value : +(x.value * 100).toFixed(3)), statedIn: x.statedIn })));
  };
  const draft: Offer | null = useMemo(() => {
    if (!f.advancePct || !f.ratePct || !f.tenureDays) return null;
    return {
      id: 'draft', tradeId: t.id, lenderId: 'me', advancePct: Number(f.advancePct) / 100, ratePct: Number(f.ratePct) / 100, tenureDays: Number(f.tenureDays),
      fees: [{ label: 'Processing fee', kind: 'pctAdvance', value: Number(f.processingPct || 0) / 100, statedIn: 'headline' }, ...fees.filter((x) => x.label && x.value).map((x) => ({ label: x.label, kind: x.kind, value: x.kind === 'flat' ? Number(x.value) : Number(x.value) / 100, statedIn: x.statedIn }))],
      recourse: f.recourse, collateral: f.collateral, conditions: f.conditions, validUntil: '', status: 'open', disbursalHours: Number(f.disbursalHours), submittedAt: '', scripted: false,
    };
  }, [f, fees, t.id]);
  const preview = draft ? computeOffer(draft, t.value * t.fx) : null;
  const submit = async () => {
    if (!draft) return;
    setBusy(true);
    try { await api('/api/offers', { json: { tradeId: t.id, productId: product?.id, advancePct: draft.advancePct, ratePct: draft.ratePct, tenureDays: draft.tenureDays, fees: draft.fees, recourse: draft.recourse, collateral: draft.collateral, conditions: draft.conditions, validDays: Number(f.validDays), disbursalHours: draft.disbursalHours } }); }
    finally { setBusy(false); }
  };

  if (ws.accepted) return <CommitPanel ws={ws} />;
  if (offers.data?.acceptedOfferId) return <Card><CardHeader title="Offer window closed" /><p className="text-sm text-ink-2">The exporter accepted another lender's offer. You were not selected.</p></Card>;
  if (mine) {
    return (
      <Card className="border-brand/30">
        <CardHeader title="Offer sent" subtitle="Sealed" right={<Lock size={18} className="text-brand" />} />
        <p className="text-sm text-ink-2">Offer sent. You can't see other lenders' offers.</p>
        <div className="grid grid-cols-2 gap-y-1.5 text-table mt-4">
          <span className="text-ink-3">Advance</span><span className="text-right tabular">{inr(mine.maths.advance)} ({(mine.offer.advancePct * 100).toFixed(0)}%)</span>
          <span className="text-ink-3">Headline rate</span><span className="text-right tabular">{(mine.offer.ratePct * 100).toFixed(1)}%</span>
          <span className="text-ink-3 font-semibold">Effective annualised cost</span><span className="text-right tabular font-semibold">{(mine.maths.effectiveAPR * 100).toFixed(2)}%</span>
          <span className="text-ink-3">Submitted</span><span className="text-right">{fmtDateTime(mine.offer.submittedAt)}{mine.offer.scripted ? ' (product rules)' : ''}</span>
        </div>
        {mine.maths.hiddenFees > 0 && <p className="text-caption text-warn mt-3">Note: {inr(mine.maths.hiddenFees)} of fees are stated only in your conditions. Cashew shows these to the exporter as hidden fees.</p>}
      </Card>
    );
  }
  if (t.status !== 'OFFERS_OPEN') return <Card><CardHeader title="Offer" /><p className="text-sm text-ink-2">This trade is not open for offers.</p></Card>;
  return (
    <Card>
      <CardHeader title="Your offer" subtitle="Sealed: no lender sees another's offer" right={<Button compact variant="secondary" onClick={defaults} disabled={!product}>Use my product defaults</Button>} />
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="adv">Advance %</Label><Input id="adv" inputMode="decimal" value={f.advancePct} onChange={(e) => setF({ ...f, advancePct: e.target.value })} /></div>
        <div><Label htmlFor="rate">Headline rate % p.a.</Label><Input id="rate" inputMode="decimal" value={f.ratePct} onChange={(e) => setF({ ...f, ratePct: e.target.value })} /></div>
        <div><Label htmlFor="ten">Tenure (days)</Label><Input id="ten" inputMode="numeric" value={f.tenureDays} onChange={(e) => setF({ ...f, tenureDays: e.target.value })} /></div>
        <div><Label htmlFor="pf">Processing fee %</Label><Input id="pf" inputMode="decimal" value={f.processingPct} onChange={(e) => setF({ ...f, processingPct: e.target.value })} /></div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-medium text-ink-2">Other fees</span><button className="text-caption text-brand font-medium flex items-center gap-1" onClick={() => setFees([...fees, { label: '', kind: 'flat', value: '', statedIn: 'headline' }])}><Plus size={12} />Add fee</button></div>
        <div className="space-y-2">
          {fees.map((x, i) => (
            <div key={i} className="grid grid-cols-[1fr_92px_70px_104px_28px] gap-1.5">
              <Input aria-label="Fee label" placeholder="Label" value={x.label} onChange={(e) => setFees(fees.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
              <Select aria-label="Fee type" value={x.kind} onChange={(e) => setFees(fees.map((y, j) => (j === i ? { ...y, kind: e.target.value as Fee['kind'] } : y)))}><option value="flat">₹ flat</option><option value="pctAdvance">% adv.</option><option value="pctInvoice">% inv.</option></Select>
              <Input aria-label="Fee value" value={x.value} onChange={(e) => setFees(fees.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
              <Select aria-label="Stated in" value={x.statedIn} onChange={(e) => setFees(fees.map((y, j) => (j === i ? { ...y, statedIn: e.target.value as Fee['statedIn'] } : y)))}><option value="headline">Headline</option><option value="conditions">Conditions</option></Select>
              <button aria-label="Remove fee" className="text-ink-3 hover:text-danger" onClick={() => setFees(fees.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div><Label htmlFor="rec">Recourse</Label><Select id="rec" value={f.recourse ? 'y' : 'n'} onChange={(e) => setF({ ...f, recourse: e.target.value === 'y' })}><option value="y">Recourse</option><option value="n">Non-recourse</option></Select></div>
        <div><Label htmlFor="col">Collateral</Label><Input id="col" value={f.collateral} onChange={(e) => setF({ ...f, collateral: e.target.value })} /></div>
        <div><Label htmlFor="dis">Disbursal (hours)</Label><Input id="dis" value={f.disbursalHours} onChange={(e) => setF({ ...f, disbursalHours: e.target.value })} /></div>
        <div><Label htmlFor="val">Valid for (days)</Label><Input id="val" value={f.validDays} onChange={(e) => setF({ ...f, validDays: e.target.value })} /></div>
        <div className="col-span-2"><Label htmlFor="cond">Conditions</Label><Textarea id="cond" value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} /></div>
      </div>
      {preview && (
        <div className="mt-4 bg-canvas border border-line rounded-btn p-3 text-table grid grid-cols-2 gap-y-1">
          <span className="text-ink-3">Advance</span><span className="text-right tabular">{inr(preview.advance)}</span>
          <span className="text-ink-3">Total cost</span><span className="text-right tabular">{inr(preview.totalCost)}</span>
          {preview.hiddenFees > 0 && <><span className="text-warn">Fees in conditions</span><span className="text-right tabular text-warn">{inr(preview.hiddenFees)}</span></>}
          <span className="font-semibold">Effective cost the exporter sees</span><span className="text-right tabular font-semibold text-h3 font-display">{(preview.effectiveAPR * 100).toFixed(2)}%</span>
          <span className="col-span-2 text-caption text-ink-3">Offers are ranked by this number, lowest first.</span>
        </div>
      )}
      <Button className="w-full mt-4" icon={<Lock size={16} />} disabled={!draft} loading={busy} onClick={submit}>Submit sealed offer</Button>
    </Card>
  );
}

function CommitPanel({ ws }: { ws: Workspace }) {
  const t = ws.trade;
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ result: string } | null>(null);
  const runCheck = async () => { setBusy(true); try { setCheck(await api('/api/registry/check', { json: { tradeId: t.id } })); } finally { setBusy(false); } };
  const commit = async () => { setBusy(true); try { await api('/api/registry/commit', { json: { tradeId: t.id } }); } finally { setBusy(false); } };
  const signed = !['OFFER_ACCEPTED', 'OFFERS_OPEN'].includes(t.status);
  return (
    <Card className={t.registryBlock ? 'border-danger/40' : 'border-brand/30'}>
      <CardHeader title="Commit financing" subtitle={`Your offer was accepted · ${ws.accepted!.lender}`} right={t.registryBlock ? <ShieldX className="text-danger" size={20} /> : <ShieldCheck className="text-brand" size={20} />} />
      <ol className="space-y-2.5 text-sm">
        <li className="flex gap-2 items-center"><CheckCircle2 size={18} className="text-success" />Offer accepted by exporter</li>
        <li className="flex gap-2 items-center">{signed ? <CheckCircle2 size={18} className="text-success" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-dashed border-line" />}Exporter e-signed {signed ? '' : '(waiting)'}</li>
        <li className="flex gap-2 items-center">{t.registryReceipt || t.registryBlock ? (t.registryBlock ? <ShieldX size={18} className="text-danger" /> : <CheckCircle2 size={18} className="text-success" />) : <span className="w-[18px] h-[18px] rounded-full border-2 border-dashed border-line" />}
          Registry check: {t.registryBlock ? <span className="text-danger font-semibold">{t.registryBlock.result === 'FINANCED_BY_OTHER' ? 'FINANCED_BY_OTHER' : 'POSSIBLE_DUPLICATE'}</span> : t.registryReceipt ? 'NONE (no match)' : 'not run'}</li>
        <li className="flex gap-2 items-center">{t.registryReceipt ? <CheckCircle2 size={18} className="text-success" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-dashed border-line" />}Registry commit</li>
        <li className="flex gap-2 items-center">{t.disbursedAt ? <CheckCircle2 size={18} className="text-success" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-dashed border-line" />}Disbursed {t.disbursedAt ? fmtDateTime(t.disbursedAt) : ''} <span className="text-[11px] text-ink-3 bg-canvas border border-line rounded-full px-2">simulated</span></li>
      </ol>
      {t.registryBlock && <p className="mt-4 text-table bg-danger-soft text-danger rounded-btn px-3 py-2">{t.registryBlock.result === 'FINANCED_BY_OTHER' ? 'This invoice has already been financed through Cashew. Details of the other lender are not shared.' : 'A very similar invoice is already financed. Held for Cashew Ops review.'}</p>}
      {t.registryReceipt && (
        <div className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 items-center text-table border-t border-line pt-4">
          <span className="text-ink-3">Fingerprint</span><HashPill value={t.registryReceipt.fingerprint} label="Fingerprint" />
          <span className="text-ink-3">Entry hash</span><HashPill value={t.registryReceipt.entryHash} label="Entry hash" />
          <span className="text-ink-3">Chain position</span><span className="tabular font-medium">#{t.registryReceipt.position}</span>
          <span className="text-ink-3">Timestamp</span><span>{fmtDateTime(t.registryReceipt.timestamp)}</span>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <Button variant="secondary" compact loading={busy} onClick={runCheck}>Run registry check</Button>
        {signed && !t.registryReceipt && <Button compact loading={busy} onClick={commit}>Commit to registry</Button>}
      </div>
      {check && <p className="text-caption mt-2">Registry says: <span className="font-mono font-semibold">{check.result}</span></p>}
      {ws.repayment && <p className="text-caption text-ink-3 mt-3">Repayment of {inr(ws.repayment.amount)} due {fmtDateTime(ws.repayment.dueAt)}.</p>}
    </Card>
  );
}
