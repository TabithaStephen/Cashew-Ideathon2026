'use client';
import { Download, HeartPulse, Webhook } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Label, Select, Textarea } from '@/components/Field';
import { StatusChip, TradeStatusChip, resultLabel, resultVariant } from '@/components/StatusChip';
import { Tabs } from '@/components/Tabs';
import { useEvidence } from '@/components/trade/VerificationPanel';
import { EvidenceDrawer } from '@/components/trade/EvidenceDrawer';
import { api, useApi } from '@/lib/client';
import { ago, fmtDateTime } from '@/lib/format';
import type { AuditEvent, OpsCase, TradeStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

type Tab = 'queue' | 'audit' | 'health';
type CaseRow = OpsCase & { exporter: string; invoiceNo?: string; tradeStatus?: TradeStatus };

export default function Ops() {
  const q = useSearchParams();
  const router = useRouter();
  const tab = (q.get('tab') as Tab) ?? 'queue';
  return (
    <div className="space-y-6">
      <div><h1>Cashew Ops</h1><p className="text-ink-2">Asha · flagged cases, human decisions, and the proof that every state change is logged.</p></div>
      <Tabs<Tab> value={tab} onChange={(t) => router.replace(`/ops?tab=${t}`)} tabs={[{ id: 'queue', label: 'Review queue' }, { id: 'audit', label: 'Audit log' }, { id: 'health', label: 'Health' }]} />
      {tab === 'queue' && <Queue />}
      {tab === 'audit' && <Audit />}
      {tab === 'health' && <Health />}
    </div>
  );
}

function Queue() {
  const { data } = useApi<CaseRow[]>('/api/ops/queue', 1500);
  const [sel, setSel] = useState<string | null>(null);
  const cases = data ?? [];
  useEffect(() => { if (!sel && cases.length) setSel(cases.find((c) => c.status === 'open')?.id ?? cases[0].id); }, [cases, sel]);
  const c = cases.find((x) => x.id === sel);
  if (data && !cases.length) return <Card><EmptyState text="No cases to review. Possible duplicates, low-confidence extractions and flagged failures appear here." /></Card>;
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
      <Card className="p-0 overflow-hidden">
        <ul>{cases.map((x) => (
          <li key={x.id}><button onClick={() => setSel(x.id)} className={cn('w-full text-left px-4 py-3 border-b border-line hover:bg-canvas', sel === x.id && 'bg-brand-soft')}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{x.reason}</span>{x.status === 'open' ? <StatusChip variant="warn" label="Open" /> : <StatusChip variant="pass" label="Decided" />}</div>
            <p className="text-caption text-ink-3 mt-0.5 font-mono">{x.tradeId} · {x.exporter}</p>
            <p className="text-caption text-ink-3">{ago(x.createdAt)} · reviewer {x.reviewer}</p>
          </button></li>))}
        </ul>
      </Card>
      {c && <div className="min-w-0"><CaseView c={c} key={c.id} /></div>}
    </div>
  );
}

function CaseView({ c }: { c: CaseRow }) {
  const { data: ev } = useEvidence(c.tradeId);
  const reqs = useApi<{ lender: string; eligible: boolean; reasons: string[]; status?: string; preview?: boolean }[]>(`/api/trades/${c.tradeId}/offer-requests`, 3000);
  const [open, setOpen] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string>(c.reason === 'Possible duplicate' ? 'Confirm duplicate' : 'Ask exporter for more info');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const focusCheck = c.reason === 'Possible duplicate' ? 12 : c.reason === 'Check 8 failed and flagged' ? 8 : null;
  const decide = async () => { setBusy(true); try { await api(`/api/ops/queue/${c.id}/decision`, { json: { outcome, note } }); } finally { setBusy(false); } };
  const detail = c.detail as { fields?: { field: string; value: unknown; confidence: number }[]; document?: string; overall?: number } | undefined;
  return (
    <div className="grid 2xl:grid-cols-[1fr_320px] gap-6 items-start">
      <Card className="min-w-0">
        <CardHeader title="Evidence" subtitle={`${c.tradeId} · ${c.exporter} · ${c.invoiceNo ?? ''}`} right={c.tradeStatus && <TradeStatusChip status={c.tradeStatus} />} />
        {c.reason === 'Low-confidence extraction' && detail?.fields && (
          <div className="mb-4"><p className="text-sm mb-2">{detail.document}: fields below 0.85 confidence</p>
            <table className="w-full text-table">{detail.fields.map((f) => <tbody key={f.field}><tr className="border-t border-line bg-warn-soft"><td className="py-1.5 px-2">{f.field}</td><td className="py-1.5 px-2 font-medium">{String(f.value)}</td><td className="py-1.5 px-2 text-right text-warn tabular">{f.confidence.toFixed(2)}</td></tr></tbody>)}</table></div>
        )}
        <div className="border border-line rounded-btn divide-y divide-line">
          {ev?.checks.filter((x) => x.record).map((x) => (
            <button key={x.checkId} onClick={() => setOpen(x.checkId)} className={cn('w-full flex items-center gap-3 px-3 py-2 text-left text-table hover:bg-canvas', x.checkId === focusCheck && 'bg-warn-soft/60')}>
              <span className="w-5 text-ink-3 tabular">{x.checkId}</span><span className="flex-1 truncate"><span className="font-medium">{x.title}</span> <span className="text-ink-2">· {x.record!.line}</span></span>
              <StatusChip variant={resultVariant(x.record!.result)} label={resultLabel[x.record!.result]} />
            </button>))}
        </div>
        {reqs.data && reqs.data.length > 0 && (
          <div className="mt-4"><p className="text-caption text-ink-3 mb-1.5">Matching: who received this trade, and why not</p>
            <ul className="text-table space-y-1">{reqs.data.map((r) => <li key={r.lender}><span className="font-medium">{r.lender}</span>: {r.eligible ? (r.preview ? 'eligible (not yet requested)' : 'offer requested') : <span className="text-ink-2">not sent. {r.reasons.join('; ')}</span>}</li>)}</ul></div>
        )}
      </Card>
      <Card>
        <CardHeader title="Decision" subtitle={c.reason} />
        {c.status === 'decided' && c.decision ? (
          <div className="space-y-2 text-sm"><StatusChip variant="pass" label={c.decision.outcome} /><p className="text-ink-2">“{c.decision.note}”</p><p className="text-caption text-ink-3">{c.decision.by} · {fmtDateTime(c.decision.at)}. Recorded as a human override in the audit log.</p></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2" role="radiogroup">
              {['Confirm duplicate', 'Clear, not a duplicate', 'Ask exporter for more info'].map((o) => (
                <label key={o} className={cn('flex items-center gap-2 border rounded-btn px-3 h-10 text-sm cursor-pointer', outcome === o ? 'border-brand bg-brand-soft' : 'border-line')}>
                  <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} className="accent-[rgb(var(--c-brand))]" />{o}
                </label>))}
            </div>
            <div><Label htmlFor="note" hint="Required">Note</Label><Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you decided this. Stored with the decision." /></div>
            <Button className="w-full" disabled={!note.trim()} loading={busy} onClick={decide}>Record decision</Button>
          </div>
        )}
      </Card>
      <EvidenceDrawer check={open ? ev?.checks.find((x) => x.checkId === open) ?? null : null} onClose={() => setOpen(null)} />
    </div>
  );
}

function Audit() {
  const { data } = useApi<AuditEvent[]>('/api/audit', 2000);
  const [trade, setTrade] = useState('');
  const trades = useMemo(() => [...new Set((data ?? []).map((e) => e.object.split('/')[0]).filter((o) => o.startsWith('TRD-')))], [data]);
  const rows = (data ?? []).filter((e) => !trade || e.object === trade || e.object.startsWith(`${trade}/`) || e.object === `trade:${trade}`);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cashew-audit${trade ? '-' + trade : ''}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-6 pt-6 flex items-end justify-between gap-4 flex-wrap mb-4">
        <div><h3 className="text-h3">Audit log</h3><p className="text-caption text-ink-3">{rows.length} events · newest first · append-only</p></div>
        <div className="flex items-end gap-2">
          <div><Label htmlFor="ft">Filter by trade</Label><Select id="ft" value={trade} onChange={(e) => setTrade(e.target.value)} className="w-56"><option value="">All events</option>{trades.map((t) => <option key={t}>{t}</option>)}</Select></div>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportJson}>Export JSON</Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[640px] overflow-y-auto"><table className="w-full text-table">
        <thead className="sticky top-0 bg-surface"><tr className="text-left text-caption text-ink-3 border-y border-line">{['Timestamp', 'Actor', 'Action', 'Object', 'Detail'].map((h) => <th key={h} className="font-medium py-2 px-4">{h}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 400).map((e) => (
          <tr key={e.id} className="border-b border-line">
            <td className="py-2 px-4 whitespace-nowrap text-ink-3 tabular">{fmtDateTime(e.timestamp).replace(' UTC', '')}</td>
            <td className="py-2 px-4 whitespace-nowrap">{e.actor}</td>
            <td className="py-2 px-4 font-mono text-[12px] text-brand whitespace-nowrap">{e.action}</td>
            <td className="py-2 px-4 font-mono text-[12px] whitespace-nowrap">{e.object}</td>
            <td className="py-2 px-4 text-ink-3 max-w-[420px] truncate">{e.meta ? JSON.stringify(e.meta) : ''}</td>
          </tr>))}</tbody>
      </table></div>
    </Card>
  );
}

function Health() {
  const { data } = useApi<{ webhooks: { id: string; type: string; tradeId?: string; at: string }[]; integrations: { name: string; checks: number[]; status: string; manualFallback: boolean }[] }>('/api/ops/events', 2000);
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.integrations.map((i) => (
          <Card key={i.name} className="p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">{i.name}</p><HeartPulse size={18} className="text-success" /></div>
            <StatusChip variant="pass" label={i.status} className="mt-2" />
            <p className="text-caption text-ink-3 mt-2">{i.checks.length ? `Check${i.checks.length > 1 ? 's' : ''} ${i.checks.join(', ')} · ` : ''}{i.manualFallback ? 'Manual fallback available' : 'No fallback'}</p>
          </Card>))}
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-6"><CardHeader title="Webhook events" subtitle="Emitted in-process; they feed notifications and the audit log" right={<Webhook size={18} className="text-ink-3" />} /></div>
        {!data?.webhooks.length ? <p className="px-6 pb-6 text-sm text-ink-3">No events yet.</p> : (
          <ul>{data.webhooks.map((w) => <li key={w.id} className="px-6 py-2 border-t border-line flex gap-4 text-table"><span className="text-ink-3 w-[150px] tabular">{fmtDateTime(w.at).replace(' UTC', '')}</span><span className="font-mono text-[12px] text-brand w-[180px]">{w.type}</span><span className="font-mono text-[12px]">{w.tradeId}</span></li>)}</ul>)}
      </Card>
    </div>
  );
}
