'use client';
import { AlertTriangle, Flag, Play, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { CheckRow } from '@/components/CheckRow';
import { api, useApi } from '@/lib/client';
import type { EvidenceRes } from '@/lib/client-types';
import type { CheckView } from '@/lib/service';
import { cn } from '@/lib/cn';
import { EvidenceDrawer } from './EvidenceDrawer';
import { AmendModal } from './AmendModal';
import { useUI } from '@/lib/ui-store';

export function useEvidence(tradeId: string | null) {
  const [fast, setFast] = useState(false);
  const q = useApi<EvidenceRes>(tradeId ? `/api/trades/${tradeId}/evidence` : null, fast ? 500 : 2000);
  const running = !!q.data?.running;
  if (running !== fast) setTimeout(() => setFast(running), 0);
  return q;
}

export function SummaryStrip({ ev }: { ev: EvidenceRes }) {
  const c = ev.counts;
  const done = ev.checks.filter((x) => x.state === 'done').length;
  const parts = [
    [c.pass, 'passed', 'text-success'], [c.unknown, 'unknown', 'text-unknown'], [c.fail, 'failed', 'text-danger'],
    [c.warn, 'possible duplicate', 'text-warn'], [c.pending, 'pending', 'text-ink-2'],
  ] as const;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-canvas border-b border-line" aria-live="polite">
      <p className="text-sm tabular">
        {parts.filter(([n]) => n > 0).map(([n, l, cls], i) => (
          <span key={l}>{i > 0 && <span className="text-ink-3">, </span>}<span className={cn('font-semibold', cls)}>{n}</span> {l}</span>
        ))}
        {done === 0 && <span className="text-ink-3">No checks run yet</span>}
      </p>
      {ev.running && <p className="text-caption text-brand font-medium">Running {Math.min(done + 1, 14)} of 14…</p>}
    </div>
  );
}

/** The 14 CheckRows with live status, evidence drawer, and the fix / flag flows. */
export function VerificationPanel({ tradeId, role = 'exporter', onFlagged, showRun = true }: { tradeId: string; role?: 'exporter' | 'lender' | 'ops'; onFlagged?: () => void; showRun?: boolean }) {
  const { data: ev } = useEvidence(tradeId);
  const [open, setOpen] = useState<number | null>(null);
  const [amend, setAmend] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ev) return <div className="h-[600px] skeleton rounded-card" />;
  const openCheck: CheckView | null = open ? ev.checks.find((c) => c.checkId === open) ?? null : null;
  const anyRun = ev.checks.some((c) => c.record) || ev.running;
  const failing = ev.checks.filter((c) => c.state === 'done' && c.record && ['fail', 'warn'].includes(c.record.result));
  const unflagged = failing.filter((c) => !ev.flagged.includes(c.checkId));
  const c8fail = failing.find((c) => c.checkId === 8);
  const c12 = failing.find((c) => c.checkId === 12);
  const exporter = role === 'exporter';

  const run = async () => { setBusy(true); try { await api(`/api/trades/${tradeId}/verify`, { json: {} }); } finally { setBusy(false); } };
  const flag = async () => { await api(`/api/trades/${tradeId}/flag`, { json: { checkIds: unflagged.map((c) => c.checkId) } }); onFlagged?.(); };

  return (
    <div className="space-y-4">
      {exporter && !ev.running && c8fail && (
        <div className="rounded-card border border-warn/40 bg-warn-soft p-4 flex gap-3 items-start">
          <AlertTriangle size={20} className="text-warn shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{c8fail.record!.line}</p>
            <p className="text-table text-ink-2 mt-0.5">{String((c8fail.record!.evidence as { interpretation?: string }).interpretation ?? 'Fix the document, or continue and lenders will see this check as failed.')}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="accent" compact onClick={() => setAmend(true)}>Upload corrected document</Button>
              <Button variant="ghost" compact onClick={() => setOpen(8)}>View evidence</Button>
              {unflagged.some((c) => c.checkId === 8) && <Button variant="ghost" compact icon={<Flag size={14} />} onClick={flag}>Continue and flag to lenders</Button>}
            </div>
          </div>
        </div>
      )}
      {exporter && !ev.running && c12 && (
        <div className={cn('rounded-card border p-4 flex gap-3 items-start', c12.record!.result === 'fail' ? 'border-danger/30 bg-danger-soft' : 'border-warn/40 bg-warn-soft')}>
          <AlertTriangle size={20} className={cn('shrink-0 mt-0.5', c12.record!.result === 'fail' ? 'text-danger' : 'text-warn')} />
          <div className="flex-1">
            <p className="text-sm font-semibold">{c12.record!.line}</p>
            <p className="text-table text-ink-2 mt-0.5">{c12.record!.result === 'fail' ? 'Lenders will not finance an invoice that is already financed. The other lender is not revealed.' : 'This invoice is very similar to one already financed. Cashew Ops will review it.'}</p>
            <div className="flex gap-2 mt-3"><Button variant="ghost" compact onClick={() => setOpen(12)}>View evidence</Button>
              {unflagged.some((c) => c.checkId === 12) && <Button variant="ghost" compact icon={<Flag size={14} />} onClick={flag}>Continue and flag to lenders</Button>}</div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded-card shadow-sm overflow-hidden">
        <SummaryStrip ev={ev} />
        {showRun && exporter && !anyRun && (
          <div className="p-6 flex items-center justify-between gap-4 border-b border-line">
            <div><p className="text-sm font-semibold">Fourteen checks, each against a source.</p><p className="text-table text-ink-2">Each result is pass, fail or unknown. Takes about 12 seconds.</p></div>
            <Button onClick={run} loading={busy} icon={<Play size={16} />}>Run verification</Button>
          </div>
        )}
        <div>
          {ev.checks.map((c) => {
            const state = c.state === 'running' ? 'running' : c.state === 'pending' ? 'pending' : c.record ? c.record.result : 'idle';
            return (
              <CheckRow key={c.checkId} id={c.checkId} title={c.title} source={c.record?.source ?? c.source} mode={c.record?.mode ?? c.mode}
                state={c.state === 'pending' && !c.record ? 'idle' : state} line={c.state === 'pending' ? 'Queued' : c.record?.line} durationMs={c.record?.durationMs}
                flagged={ev.flagged.includes(c.checkId) && !!c.record && c.record.result !== 'pass'} history={c.history}
                onOpen={c.record ? () => setOpen(c.checkId) : undefined} />
            );
          })}
        </div>
        {showRun && exporter && anyRun && !ev.running && (
          <div className="px-4 py-3 border-t border-line flex justify-between items-center">
            <span className="text-caption text-ink-3">Re-running appends new results; history is preserved.</span>
            <Button variant="ghost" compact icon={<RotateCw size={14} />} onClick={run}>Re-run all checks</Button>
          </div>
        )}
      </div>
      <EvidenceDrawer check={openCheck} onClose={() => setOpen(null)} onFix={exporter ? () => { setOpen(null); setAmend(true); } : undefined}
        onSendToOps={role === 'exporter' ? () => useUI.getState().toast({ tone: 'info', text: 'Sent to Cashew Ops for review. Asha will record a decision.' }) : undefined} />
      <AmendModal tradeId={tradeId} open={amend} onClose={() => setAmend(false)} />
    </div>
  );
}
