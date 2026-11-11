'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { DocSlot, type DocSlotState } from '@/components/DocSlot';
import { Stepper } from '@/components/Stepper';
import { useToast } from '@/components/Toast';
import { Callout, KeyValues, PageHead, StrengthPanel, TradeStatusChip, TradeValue } from '@/components/app/parts';
import { useSourceLabel, VerificationList } from '@/components/app/Verification';
import { api, refreshAll, useAction, useApi } from '@/lib/client/api';
import { scaled, useUi } from '@/lib/client/uiStore';
import { formatExportValue } from '@/lib/format';
import { DOC_LABEL } from '@/lib/ui';

const STEPS = ['Trade details', 'Documents', 'Verification', 'Review and consent'];
const SLOTS = ['po', 'invoice', 'packing', 'shippingBill', 'bl'] as const;

const SAMPLES: Record<string, { label: string; form: { buyerId: string; goods: string; hsCode: string; value: string; incoterm: string; paymentTermsDays: string }; docSet: string }> = {
  A: { label: 'Scenario A', docSet: 'A', form: { buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts', hsCode: '610910', value: '18750', incoterm: 'FOB', paymentTermsDays: '90' } },
  B: { label: 'Scenario B', docSet: 'B', form: { buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts', hsCode: '610910', value: '30000', incoterm: 'FOB', paymentTermsDays: '90' } },
  C1: { label: 'Scenario C: exact copy', docSet: 'C1', form: { buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts', hsCode: '610910', value: '18400', incoterm: 'FOB', paymentTermsDays: '90' } },
  C2: { label: 'Scenario C: altered copy', docSet: 'C2', form: { buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts', hsCode: '610910', value: '18900', incoterm: 'FOB', paymentTermsDays: '90' } },
};

const HS_SUGGESTIONS: Array<[RegExp, string, string]> = [
  [/t-?shirt|knit/i, '610910', 'T-shirts, knitted, of cotton'],
  [/shirt/i, '620520', 'Men’s shirts, of cotton'],
  [/towel|linen/i, '630260', 'Terry towelling, of cotton'],
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function DetailsStep({ scenario, buyers, onCreated, form, setForm, docSet, setDocSet }: any) {
  const { run, busy } = useAction();
  const [query, setQuery] = useState('');
  const set = (key: string, value: string) => setForm((f: any) => ({ ...f, [key]: value }));
  const sampleKeys = scenario === 'C' ? ['C1', 'C2'] : ['A', 'B'];
  const suggestion = HS_SUGGESTIONS.find(([pattern]) => pattern.test(form.goods));
  const shown = buyers.filter((b: any) => b.name.toLowerCase().includes(query.toLowerCase()) || b.id === form.buyerId);
  const ready = form.buyerId && form.goods && form.hsCode && Number(form.value) > 0 && Number(form.paymentTermsDays) > 0;

  const submit = async () => {
    const trade = await run(() => api('trades', { body: { ...form, value: Number(form.value), paymentTermsDays: Number(form.paymentTermsDays), docSet } }));
    if (trade) onCreated(trade.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="field-label">Use sample trade</span>
        {sampleKeys.map((key) => (
          <Button key={key} size="compact" onClick={() => { setForm(SAMPLES[key].form); setDocSet(SAMPLES[key].docSet); }}>{SAMPLES[key].label}</Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Find a buyer"><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a name" /></Field>
        <Field label="Buyer">
          <select className="input" value={form.buyerId} onChange={(e) => set('buyerId', e.target.value)}>
            <option value="">Choose a buyer</option>
            {shown.map((b: any) => <option key={b.id} value={b.id}>{b.name} ({b.country})</option>)}
          </select>
        </Field>
        <Field label="Goods"><input className="input" value={form.goods} onChange={(e) => set('goods', e.target.value)} /></Field>
        <div>
          <Field label="HS code"><input className="input tabular" value={form.hsCode} onChange={(e) => set('hsCode', e.target.value)} /></Field>
          {suggestion && suggestion[1] !== form.hsCode && (
            <button type="button" className="mt-1 min-h-11 text-table underline underline-offset-4" onClick={() => set('hsCode', suggestion[1])}>Use {suggestion[1]}: {suggestion[2]}</button>
          )}
        </div>
        <Field label="Value (USD)"><input className="input tabular" inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} /></Field>
        <Field label="Incoterm">
          <select className="input" value={form.incoterm} onChange={(e) => set('incoterm', e.target.value)}>
            {['FOB', 'CIF', 'CFR', 'EXW'].map((term) => <option key={term}>{term}</option>)}
          </select>
        </Field>
        <Field label="Payment terms (days)"><input className="input tabular" inputMode="numeric" value={form.paymentTermsDays} onChange={(e) => set('paymentTermsDays', e.target.value)} /></Field>
      </div>
      <div><Button variant="primary" disabled={!ready} loading={busy} onClick={submit}>Continue to documents</Button></div>
    </div>
  );
}

function DocumentsStep({ trade, onNext }: { trade: any; onNext: () => void }) {
  const speed = useUi((s) => s.speed);
  const toast = useToast();
  const [scanning, setScanning] = useState<Record<string, string>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const docFor = (type: string) => trade.docs.find((d: any) => d.type === type);

  const upload = useCallback((type: string, file: File | undefined, delay: number) => {
    const name = file?.name ?? `${type}.pdf`;
    const begin = window.setTimeout(() => {
      setScanning((s) => ({ ...s, [type]: name }));
      const ms = scaled(1500 + Math.random() * 1000, speed);
      const finish = window.setTimeout(async () => {
        try {
          const form = new FormData();
          form.set('slot', type);
          if (file) form.set('file', file);
          await api(`trades/${trade.id}/documents`, { form });
          refreshAll();
        } catch (e) {
          toast((e as Error).message, { tone: 'fail' });
        } finally {
          setScanning((s) => {
            const { [type]: _done, ...rest } = s;
            return rest;
          });
        }
      }, ms);
      timers.current.push(finish);
    }, delay);
    timers.current.push(begin);
  }, [speed, toast, trade.id]);

  const useSamples = () => {
    SLOTS.filter((type) => !docFor(type) && !scanning[type]).forEach((type, i) => upload(type, undefined, scaled(i * 300, speed)));
  };

  const complete = SLOTS.every((type) => docFor(type));
  return (
    <div className="flex flex-col gap-4">
      <div><Button disabled={complete} onClick={useSamples}>Use sample documents</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((type) => {
          const doc = docFor(type);
          const fields = doc ? Object.values(doc.extracted) as any[] : [];
          const review = fields.filter((f) => f.confidence < 0.85).length;
          const state: DocSlotState = scanning[type] ? 'scanning' : !doc ? 'empty' : review > 0 ? 'needs-review' : 'extracted';
          return (
            <DocSlot key={type} docName={DOC_LABEL[type]} state={state} fileName={scanning[type] ?? doc?.fileName} fieldCount={fields.length} reviewCount={review} onFile={(file) => upload(type, file, 0)} />
          );
        })}
      </div>
      <p className="text-table text-ink-2">Reading is simulated: the fields come from the sample data, whichever file you choose.</p>
      <div><Button variant="primary" disabled={!complete} onClick={onNext}>Continue to verification</Button></div>
    </div>
  );
}

function CorrectedDocument({ trade, onUploaded }: { trade: any; onUploaded: () => void }) {
  const speed = useUi((s) => s.speed);
  const toast = useToast();
  const [state, setState] = useState<DocSlotState>('empty');
  const [name, setName] = useState<string>();
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = (file?: File) => {
    setName(file?.name ?? 'amended-invoice.pdf');
    setState('scanning');
    timer.current = window.setTimeout(async () => {
      try {
        const form = new FormData();
        form.set('slot', 'invoice');
        if (file) form.set('file', file);
        await api(`trades/${trade.id}/documents`, { form });
        await api(`trades/${trade.id}/verify`, { body: { checkId: 8 } });
        refreshAll();
        onUploaded();
      } catch (e) {
        toast((e as Error).message, { tone: 'fail' });
        setState('empty');
      }
    }, scaled(1500, speed));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <DocSlot docName="Amended Commercial Invoice" state={state} fileName={name} onFile={send} />
      {state === 'empty' && <div><Button size="compact" onClick={() => send()}>Use the sample amended invoice</Button></div>}
    </div>
  );
}

function VerificationStep({ trade, onNext }: { trade: any; onNext: () => void }) {
  const { data: bundle } = useApi<any>(`trades/${trade.id}/evidence`, 500);
  const { run, busy } = useAction();
  const [uploading, setUploading] = useState(false);
  const start = () => run(() => api(`trades/${trade.id}/verify`, { body: {} }));
  const row = (id: number) => bundle?.checks.find((c: any) => c.checkId === id);
  const check8 = row(8);
  const blocked = trade.status === 'REJECTED_VERIFICATION';
  const fuzzy = row(12)?.flag === 'possible-duplicate';
  const sent = trade.openCases.some((c: any) => c.reason === 'Possible duplicate');
  const sendToOps = () => run(() => api(`trades/${trade.id}/ops-review`, { method: 'POST' }));
  const failing8 = trade.status === 'NEEDS_INFO' && check8?.result === 'fail';

  return (
    <div className="flex flex-col gap-4">
      {!bundle?.started && <div><Button variant="primary" loading={busy} onClick={start}>Run verification</Button></div>}
      {blocked && (
        <Callout tone="fail" title="This invoice has already been financed through Cashew.">
          Details of the other lender are not shared. This trade can’t go to lenders.
        </Callout>
      )}
      {fuzzy && trade.status === 'NEEDS_INFO' && (
        <Callout tone="warn" title="Possible duplicate. A reviewer needs to look at this." action={sent ? undefined : <Button variant="primary" loading={busy} onClick={sendToOps}>Send to Ops review</Button>}>
          {sent ? 'Sent to Ops review. You’ll be told the outcome here.' : 'This looks close to an invoice already financed. Open check 12 to see the comparison.'}
        </Callout>
      )}
      {failing8 && (
        <Callout
          tone="warn"
          title={check8.line}
          action={
            uploading ? (
              <CorrectedDocument trade={trade} onUploaded={() => setUploading(false)} />
            ) : (
              <>
                <Button variant="primary" onClick={() => setUploading(true)}>Upload corrected document</Button>
                <Button variant="ghost" loading={busy} onClick={() => run(() => api(`trades/${trade.id}/flag`, { method: 'POST' }))}>Continue and flag to lenders</Button>
              </>
            )
          }
        >
          Fix it now, or send the trade on with this failure shown to every lender.
        </Callout>
      )}
      {check8?.result === 'pass' && check8.versions > 1 && <Callout tone="pass" title="Documents now agree. Check 8 passes." />}
      <VerificationList bundle={bundle} onSendToOps={sendToOps} alreadySent={sent} />
      <div><Button variant="primary" disabled={trade.status !== 'VERIFIED'} onClick={onNext}>Continue to review</Button></div>
    </div>
  );
}

function ConsentStep({ trade }: { trade: any }) {
  const router = useRouter();
  const source = useSourceLabel();
  const { data: bundle } = useApi<any>(`trades/${trade.id}/evidence`, 1000);
  const { run, busy } = useAction();
  const [agreed, setAgreed] = useState(false);
  const open: any[] = bundle?.checks.filter((c: any) => c.result !== 'pass') ?? [];

  const openToLenders = async () => {
    const done = await run(async () => {
      await api('consents', { body: { tradeId: trade.id, flagged: open.map((c) => c.checkId) } });
      return api(`trades/${trade.id}/offer-requests`, { method: 'POST' });
    });
    if (done) router.push(`/app/trades/${trade.id}?tab=offers`);
  };

  return (
    <div className="flex flex-col gap-4">
      <StrengthPanel risk={trade.risk} openChecks={open.length} />
      {open.length > 0 && (
        <div className="panel p-4">
          <p className="font-semibold">Lenders will see these as open</p>
          <ul className="mt-1 flex flex-col gap-1 text-table">
            {open.map((c) => <li key={c.checkId}><span className="font-medium">{c.checkId}. {c.title}</span> <span className="text-ink-2">({source(c)}): {c.line}</span></li>)}
          </ul>
        </div>
      )}
      <div className="panel flex flex-col gap-3 p-4">
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-5 flex-none" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>Share this trade and its evidence with lenders for 30 days. You can revoke at any time.</span>
        </label>
        <div><Button variant="primary" disabled={!agreed} loading={busy} onClick={openToLenders}>Open to lenders</Button></div>
      </div>
    </div>
  );
}

export default function NewTrade() {
  const router = useRouter();
  const [tradeId, setTradeId] = useState<string>();
  const [step, setStep] = useState<number>();
  const [form, setForm] = useState({ buyerId: '', goods: '', hsCode: '', value: '', incoterm: 'FOB', paymentTermsDays: '90' });
  const [docSet, setDocSet] = useState<string>();
  const { data: me } = useApi<any>('orgs/me', 0);
  const { data: buyers } = useApi<any>('buyers', 0);
  const { data: trade, error } = useApi<any>(tradeId ? `trades/${tradeId}` : null, 500);

  // The trade id in the address makes the wizard safe to refresh.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('trade');
    if (id) setTradeId(id);
    else setStep(0);
  }, []);
  useEffect(() => {
    if (error?.status === 404) {
      setTradeId(undefined);
      setStep(0);
      router.replace('/app/trades/new');
    }
  }, [error, router]);
  useEffect(() => {
    if (!trade || step !== undefined) return;
    setStep(trade.status === 'DRAFT' && trade.docs.length < 5 ? 1 : 2);
  }, [trade, step]);

  const created = (id: string) => {
    setTradeId(id);
    setStep(1);
    window.history.replaceState(null, '', `/app/trades/new?trade=${id}`);
  };

  const summary: Array<[string, React.ReactNode]> = trade
    ? [['Trade', <span key="id" className="font-mono text-label">{trade.id}</span>], ['Buyer', trade.buyerName], ['Goods', trade.goods], ['HS code', trade.hsCode], ['Value', <TradeValue key="v" value={trade.value} fx={trade.fx} />], ['Terms', `${trade.incoterm}, ${trade.paymentTermsDays} days`], ['Documents', `${trade.docs.length} of 5`], ['Status', <TradeStatusChip key="s" status={trade.status} />]]
    : [['Buyer', buyers?.buyers.find((b: any) => b.id === form.buyerId)?.name ?? '—'], ['Goods', form.goods || '—'], ['HS code', form.hsCode || '—'], ['Value', Number(form.value) > 0 ? formatExportValue(Number(form.value), 85) : '—'], ['Terms', `${form.incoterm}, ${form.paymentTermsDays || '—'} days`]];

  return (
    <>
      <PageHead title="New trade" />
      <div className="mb-6"><Stepper steps={STEPS} current={step ?? 0} label="New trade progress" /></div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {step === 0 && me && buyers && <DetailsStep scenario={me.scenario} buyers={buyers.buyers} onCreated={created} form={form} setForm={setForm} docSet={docSet} setDocSet={setDocSet} />}
          {step === 1 && trade && <DocumentsStep trade={trade} onNext={() => setStep(2)} />}
          {step === 2 && trade && <VerificationStep trade={trade} onNext={() => setStep(3)} />}
          {step === 3 && trade && <ConsentStep trade={trade} />}
        </div>
        <aside className="panel p-4 lg:sticky lg:top-[calc(var(--ribbon-height)+var(--caption-height)+16px)]">
          <h2 className="mb-2">Trade summary</h2>
          <KeyValues rows={summary} />
        </aside>
      </div>
    </>
  );
}
