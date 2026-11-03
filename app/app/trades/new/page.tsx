'use client';
import { ArrowLeft, ArrowRight, FileStack, Lock, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { DocSlot } from '@/components/DocSlot';
import { Checkbox, Input, Label, Select } from '@/components/Field';
import { Stepper } from '@/components/Stepper';
import { StatusChip } from '@/components/StatusChip';
import { DocDetailDrawer, reviewCount } from '@/components/trade/DocDetailDrawer';
import { EvidenceStrength } from '@/components/trade/EvidenceStrength';
import { useEvidence, VerificationPanel } from '@/components/trade/VerificationPanel';
import { api, useApi } from '@/lib/client';
import type { Workspace } from '@/lib/client-types';
import { exportValue } from '@/lib/format';
import { useMe } from '@/lib/session';
import { scaled, useUI } from '@/lib/ui-store';
import { DOC_LABELS, DOC_TYPES, type Buyer, type DocType } from '@/lib/types';

const STEPS = ['Trade details', 'Documents', 'Verification', 'Review and consent'];
type SampleKey = 'A' | 'B' | 'C1' | 'C2';
const SAMPLE_FORM: Record<SampleKey, { buyerId: string; goods: string; hsCode: string; value: number; incoterm: string; paymentTermsDays: number; label: string; prefix: string }> = {
  A: { buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts, crew neck', hsCode: '610910', value: 18750, incoterm: 'FOB', paymentTermsDays: 90, label: 'A · Clean', prefix: 'A' },
  B: { buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts, assorted colours', hsCode: '610910', value: 30000, incoterm: 'FOB', paymentTermsDays: 90, label: 'B · Inconsistent', prefix: 'B' },
  C1: { buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts, organic', hsCode: '610910', value: 18400, incoterm: 'FOB', paymentTermsDays: 90, label: 'C · Exact copy', prefix: 'C' },
  C2: { buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts, organic', hsCode: '610910', value: 18900, incoterm: 'FOB', paymentTermsDays: 90, label: 'C · Altered copy', prefix: 'C2' },
};
const BUYER_NAMES: Record<string, string> = { buyer_northgate: 'Northgate Apparel Ltd', buyer_hartwell: 'Hartwell & Rowe Retail Ltd' };
const FILE: Record<DocType, string> = { po: 'purchase-order', invoice: 'commercial-invoice', packing: 'packing-list', shippingBill: 'shipping-bill', bl: 'bill-of-lading' };
const HS_SUGGEST: [RegExp, string, string][] = [[/t-?shirt|tee|knit/i, '610910', 'T-shirts, knitted, of cotton'], [/shirt/i, '620520', 'Men’s shirts of cotton'], [/towel/i, '630260', 'Terry towelling of cotton'], [/sock|hosiery/i, '611595', 'Socks of cotton']];

export default function NewTrade() {
  const q = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const tradeId = q.get('trade');
  const urlStep = Math.max(1, Math.min(4, Number(q.get('step') ?? 1)));
  const [step, setStep] = useState(urlStep);
  useEffect(() => setStep(urlStep), [urlStep]);
  const ws = useApi<Workspace>(tradeId ? `/api/trades/${tradeId}` : null, 1500);
  const ev = useEvidence(tradeId);
  const go = (s: number, id = tradeId) => router.replace(`/app/trades/new?${id ? `trade=${id}&` : ''}step=${s}`);

  const status = ws.data?.trade.status;
  const docsCount = Object.keys(ws.data?.docs ?? {}).length;
  const maxReach = !tradeId ? 0 : status === 'DRAFT' ? (docsCount === 5 ? 2 : 1) : status === 'VERIFIED' || status === 'NEEDS_INFO' ? 3 : 2;

  return (
    <div className="space-y-6">
      <div><h1>New trade</h1><p className="text-ink-2">Verify once. Share with many lenders.</p></div>
      <Card className="py-4"><Stepper steps={STEPS} current={step - 1} maxReachable={maxReach} onStep={(i) => go(i + 1)} /></Card>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="min-w-0">
          {step === 1 && <StepDetails tradeId={tradeId} ws={ws.data} scenario={me.data?.scenario} onCreated={(id) => go(2, id)} onNext={() => go(2)} />}
          {step === 2 && tradeId && <StepDocuments tradeId={tradeId} ws={ws.data} onBack={() => go(1)} onNext={() => go(3)} />}
          {step === 3 && tradeId && <StepVerify tradeId={tradeId} status={status} onBack={() => go(2)} onNext={() => go(4)} />}
          {step === 4 && tradeId && ws.data && <StepConsent ws={ws.data} onBack={() => go(3)} onDone={() => router.push(`/app/trades/${tradeId}?tab=offers`)} />}
        </div>
        <SummaryCard ws={ws.data} counts={ev.data?.counts} />
      </div>
    </div>
  );
}

function SummaryCard({ ws, counts }: { ws?: Workspace; counts?: { pass: number; fail: number; unknown: number; pending: number; warn: number } }) {
  const t = ws?.trade;
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-3 py-1.5 border-b border-line last:border-0"><span className="text-ink-3">{k}</span><span className="text-right font-medium">{v ?? '–'}</span></div>;
  return (
    <Card className="lg:sticky lg:top-[112px]">
      <CardHeader title="Trade summary" subtitle={t ? t.id : 'Fills in as you go'} />
      <div className="text-table">
        <Row k="Buyer" v={ws?.buyer.name} />
        <Row k="Goods" v={t?.goods} />
        <Row k="HS code" v={t?.hsCode} />
        <Row k="Value" v={t && <span className="tabular">{exportValue(t.value, t.fx)}</span>} />
        <Row k="Incoterm" v={t?.incoterm} />
        <Row k="Payment terms" v={t && `${t.paymentTermsDays} days`} />
        <Row k="Documents" v={ws ? `${Object.keys(ws.docs).length} of 5` : undefined} />
        <Row k="Checks" v={counts && counts.pass + counts.fail + counts.unknown + counts.pending + counts.warn > 0 ? `${counts.pass} pass · ${counts.fail + counts.warn} issue · ${counts.unknown + counts.pending} open` : undefined} />
      </div>
      {t && <div className="mt-3"><StatusChip variant="info" label={t.status.replace(/_/g, ' ').toLowerCase()} /></div>}
    </Card>
  );
}

function StepDetails({ tradeId, ws, scenario, onCreated, onNext }: { tradeId: string | null; ws?: Workspace; scenario?: string; onCreated: (id: string) => void; onNext: () => void }) {
  const buyers = useApi<Buyer[]>('/api/buyers');
  const [sample, setSample] = useState<SampleKey | null>(null);
  const [f, setF] = useState({ buyerId: '', buyer: '', goods: '', hsCode: '', value: '', currency: 'USD', incoterm: 'FOB', paymentTermsDays: '90' });
  const [busy, setBusy] = useState(false);
  const locked = !!tradeId;
  useEffect(() => {
    if (ws) setF({ buyerId: ws.buyer.id, buyer: ws.buyer.name, goods: ws.trade.goods, hsCode: ws.trade.hsCode, value: String(ws.trade.value), currency: ws.trade.currency, incoterm: ws.trade.incoterm, paymentTermsDays: String(ws.trade.paymentTermsDays) });
  }, [ws?.trade.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = (k: SampleKey) => {
    const s = SAMPLE_FORM[k];
    setSample(k);
    setF({ buyerId: s.buyerId, buyer: buyers.data?.find((b) => b.id === s.buyerId)?.name ?? BUYER_NAMES[s.buyerId] ?? '', goods: s.goods, hsCode: s.hsCode, value: String(s.value), currency: 'USD', incoterm: s.incoterm, paymentTermsDays: String(s.paymentTermsDays) });
  };
  const suggestion = useMemo(() => HS_SUGGEST.find(([re]) => re.test(f.goods)), [f.goods]);
  const buyer = buyers.data?.find((b) => b.id === f.buyerId) ?? (f.buyerId ? { id: f.buyerId, name: f.buyer, city: '', country: '', registrationId: '' } as Buyer : undefined);
  const valid = buyer && f.goods && f.hsCode && Number(f.value) > 0;
  const submit = async () => {
    if (locked) return onNext();
    setBusy(true);
    try {
      const key = sample ?? (scenario === 'C' ? 'C1' : (scenario as SampleKey) ?? 'B');
      const r = await api<{ id: string }>('/api/trades', { json: { sample: key, buyerId: buyer!.id, goods: f.goods, hsCode: f.hsCode, value: Number(f.value), currency: f.currency, incoterm: f.incoterm, paymentTermsDays: Number(f.paymentTermsDays) } });
      onCreated(r.id);
    } finally { setBusy(false); }
  };
  const recommended: SampleKey = scenario === 'C' ? 'C1' : (scenario as SampleKey) ?? 'B';
  return (
    <Card>
      <CardHeader title="Trade details" subtitle="Who are you selling to, and what?" right={!locked && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className="text-caption text-ink-3 mr-1 flex items-center gap-1"><Sparkles size={13} />Use sample trade</span>
          {(Object.keys(SAMPLE_FORM) as SampleKey[]).map((k) => (
            <Button key={k} compact variant={k === recommended ? 'primary' : 'secondary'} className="h-8" onClick={() => fill(k)}>{SAMPLE_FORM[k].label}</Button>
          ))}
        </div>)} />
      {locked && <p className="text-caption text-ink-3 mb-4 flex items-center gap-1"><Lock size={12} /> Trade created. Details are locked; the invoice is the source of truth from here.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="buyer" hint="Searchable, from the buyer registry">Buyer</Label>
          <Input id="buyer" list="buyers-list" disabled={locked} value={f.buyer} onChange={(e) => { const m = buyers.data?.find((b) => b.name.toLowerCase() === e.target.value.trim().toLowerCase()); setF({ ...f, buyer: e.target.value, buyerId: m?.id ?? '' }); }} placeholder="Start typing a buyer name" />
          <datalist id="buyers-list">{buyers.data?.map((b) => <option key={b.id} value={b.name}>{`${b.city}, ${b.country}`}</option>)}</datalist>
          {buyer && buyer.city && <p className="text-caption text-ink-3 mt-1">{buyer.city}, {buyer.country} · Reg. {buyer.registrationId}</p>}
        </div>
        <div className="sm:col-span-2"><Label htmlFor="goods">Goods description</Label><Input id="goods" disabled={locked} value={f.goods} onChange={(e) => setF({ ...f, goods: e.target.value })} placeholder="e.g. Cotton knit T-shirts" /></div>
        <div>
          <Label htmlFor="hs" hint="Auto-suggested">HS code</Label>
          <Input id="hs" disabled={locked} value={f.hsCode} onChange={(e) => setF({ ...f, hsCode: e.target.value.replace(/\D/g, '') })} />
          {!locked && suggestion && suggestion[1] !== f.hsCode && (
            <button className="text-caption text-brand mt-1 hover:underline" onClick={() => setF({ ...f, hsCode: suggestion[1] })}>Suggested: {suggestion[1]} · {suggestion[2]}</button>
          )}
        </div>
        <div>
          <Label htmlFor="val" hint={Number(f.value) > 0 ? `≈ ${exportValue(Number(f.value)).split('(')[1]?.replace(')', '')}` : 'USD 1 = ₹85.00'}>Invoice value</Label>
          <div className="flex gap-2"><Select aria-label="Currency" disabled={locked} className="w-24" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}><option>USD</option></Select>
            <Input id="val" disabled={locked} inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^\d.]/g, '') })} /></div>
        </div>
        <div><Label htmlFor="inc">Incoterm</Label><Select id="inc" disabled={locked} value={f.incoterm} onChange={(e) => setF({ ...f, incoterm: e.target.value })}>{['FOB', 'CIF', 'CFR', 'EXW', 'DAP'].map((x) => <option key={x}>{x}</option>)}</Select></div>
        <div><Label htmlFor="pt">Payment terms (days)</Label><Select id="pt" disabled={locked} value={f.paymentTermsDays} onChange={(e) => setF({ ...f, paymentTermsDays: e.target.value })}>{['30', '60', '90', '120'].map((x) => <option key={x}>{x}</option>)}</Select></div>
      </div>
      <div className="flex justify-end mt-6"><Button disabled={!locked && !valid} loading={busy} onClick={submit} icon={<ArrowRight size={16} />}>{locked ? 'Continue' : 'Save and add documents'}</Button></div>
    </Card>
  );
}

function StepDocuments({ tradeId, ws, onBack, onNext }: { tradeId: string; ws?: Workspace; onBack: () => void; onNext: () => void }) {
  const [scanning, setScanning] = useState<Partial<Record<DocType, boolean>>>({});
  const [openDoc, setOpenDoc] = useState<DocType | null>(null);
  const [filling, setFilling] = useState(false);
  const speed = useUI((s) => s.speed);
  const prefix = { A: 'A', B: 'B', C: 'C' }[ws?.trade.scenario ?? 'B'] ?? 'B';
  const samplePrefix = ws?.trade.invoiceNo?.endsWith('-A') ? 'C2' : prefix;

  const upload = async (type: DocType, file: File) => {
    setScanning((s) => ({ ...s, [type]: true }));
    const form = new FormData(); form.set('file', file); form.set('type', type);
    const t0 = Date.now();
    try {
      await api(`/api/trades/${tradeId}/documents`, { form });
      const dur = scaled(1500 + Math.random() * 1000, speed);
      await new Promise((r) => setTimeout(r, Math.max(0, dur - (Date.now() - t0))));
    } finally { setScanning((s) => ({ ...s, [type]: false })); }
  };
  const useSamples = async () => {
    setFilling(true);
    const jobs = DOC_TYPES.map(async (type, i) => {
      await new Promise((r) => setTimeout(r, scaled(300 * i, speed)));
      const name = `${samplePrefix}-${FILE[type]}.pdf`;
      const blob = await fetch(`/sample-docs/${name}`).then((r) => r.blob());
      await upload(type, new File([blob], name, { type: 'application/pdf' }));
    });
    await Promise.allSettled(jobs);
    setFilling(false);
  };
  const docs = ws?.docs ?? {};
  const allDone = DOC_TYPES.every((t) => docs[t] && !scanning[t]);
  const opened = openDoc ? docs[openDoc] ?? null : null;
  return (
    <Card>
      <CardHeader title="Documents" subtitle="Drop the five trade documents. We read them in seconds."
        right={<Button variant="secondary" compact icon={<FileStack size={14} />} loading={filling} disabled={allDone} onClick={useSamples}>Use sample documents</Button>} />
      <div className="grid sm:grid-cols-2 gap-4">
        {DOC_TYPES.map((t) => {
          const d = docs[t];
          const rc = reviewCount(d);
          const state = scanning[t] ? 'scanning' : d ? (rc ? 'review' : 'extracted') : 'empty';
          return <DocSlot key={t} label={DOC_LABELS[t]} state={state} fieldCount={d ? Object.keys(d.extracted.fields).length : 0} reviewCount={rc} fileName={d?.fileName} version={d?.version}
            amended={d?.amended} onFile={(f) => upload(t, f)} onOpen={() => setOpenDoc(t)} />;
        })}
      </div>
      <p className="text-caption text-ink-3 mt-4">Files are hashed (SHA-256) on upload. Field extraction is simulated in the demo.</p>
      <div className="flex justify-between mt-6"><Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>Back</Button>
        <Button disabled={!allDone} onClick={onNext} icon={<ArrowRight size={16} />}>Continue to verification</Button></div>
      <DocDetailDrawer doc={opened} onClose={() => setOpenDoc(null)} canReview />
    </Card>
  );
}

function StepVerify({ tradeId, status, onBack, onNext }: { tradeId: string; status?: string; onBack: () => void; onNext: () => void }) {
  const { data: ev } = useEvidence(tradeId);
  const failing = ev?.checks.filter((c) => c.state === 'done' && c.record && ['fail', 'warn'].includes(c.record.result)) ?? [];
  const allFlagged = failing.length > 0 && failing.every((c) => ev!.flagged.includes(c.checkId));
  const canGo = !ev?.running && (status === 'VERIFIED' || (status === 'NEEDS_INFO' && allFlagged));
  return (
    <div className="space-y-4">
      <VerificationPanel tradeId={tradeId} />
      <div className="flex justify-between items-center">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>Back</Button>
        <div className="flex items-center gap-3">
          {!canGo && status === 'NEEDS_INFO' && !ev?.running && <span className="text-caption text-warn">Resolve the failed check, or continue and flag it to lenders.</span>}
          {allFlagged && <span className="text-caption text-warn">Failed checks will be shown to lenders as flagged.</span>}
          <Button disabled={!canGo} onClick={onNext} icon={<ArrowRight size={16} />}>Continue to review</Button>
        </div>
      </div>
    </div>
  );
}

function StepConsent({ ws, onBack, onDone }: { ws: Workspace; onBack: () => void; onDone: () => void }) {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: ev } = useEvidence(ws.trade.id);
  const asIs = ev?.checks.filter((c) => c.record && c.record.result !== 'pass') ?? [];
  const elig = useApi<{ lender: string; eligible: boolean; reasons: string[] }[]>(`/api/trades/${ws.trade.id}/offer-requests`);
  const open = async () => { setBusy(true); try { await api(`/api/trades/${ws.trade.id}/offer-requests`, { json: {} }); onDone(); } finally { setBusy(false); } };
  const already = ws.trade.status !== 'VERIFIED' && ws.trade.status !== 'NEEDS_INFO';
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Review" subtitle={`${ws.trade.id} · ${ws.buyer.name}`} />
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="text-table space-y-1.5">
            <p><span className="text-ink-3">Invoice</span> <span className="font-medium">{ws.trade.invoiceNo}</span></p>
            <p><span className="text-ink-3">Value</span> <span className="font-medium tabular">{exportValue(ws.trade.value, ws.trade.fx)}</span></p>
            <p><span className="text-ink-3">Terms</span> <span className="font-medium">{ws.trade.incoterm}, {ws.trade.paymentTermsDays} days</span></p>
            <p><span className="text-ink-3">Corridor</span> <span className="font-medium">{ws.trade.corridor}</span></p>
            {asIs.length > 0 && (
              <div className="pt-3">
                <p className="text-caption text-ink-3 mb-1.5">Passed to lenders exactly as they are:</p>
                <div className="flex flex-wrap gap-1.5">{asIs.map((c) => <StatusChip key={c.checkId} variant={c.record!.result === 'warn' ? 'warn' : c.record!.result as 'fail' | 'unknown' | 'pending'} label={`#${c.checkId} ${c.record!.result === 'warn' ? 'possible duplicate' : c.record!.result}`} />)}</div>
              </div>
            )}
          </div>
          {ws.risk && <div><p className="text-caption text-ink-3 mb-2">Evidence strength</p><EvidenceStrength risk={ws.risk} /></div>}
        </div>
      </Card>
      <Card className="border-brand/30">
        <CardHeader title="Consent" subtitle="A consent artefact is recorded on the trade's Activity tab. You can revoke it at any time." />
        <p className="text-sm mb-3">Lenders matched by product rules:{' '}
          {elig.data ? elig.data.map((e, i) => <span key={e.lender}>{i > 0 && ', '}<span className={e.eligible ? 'font-medium' : 'text-ink-3 line-through'} title={e.reasons.join('; ')}>{e.lender}</span></span>) : '…'}
        </p>
        <Checkbox id="consent" checked={ok || already} onChange={setOk}>Share this trade and its evidence with lenders for 30 days. You can revoke at any time.</Checkbox>
        <div className="flex justify-between mt-6"><Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>Back</Button>
          {already ? <Button onClick={onDone} icon={<ArrowRight size={16} />}>View offers</Button> : <Button disabled={!ok} loading={busy} onClick={open} icon={<ArrowRight size={16} />}>Open to lenders</Button>}</div>
      </Card>
    </div>
  );
}
