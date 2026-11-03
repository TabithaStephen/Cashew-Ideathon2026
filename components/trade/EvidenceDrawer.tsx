'use client';
import { useState } from 'react';
import { Drawer } from '@/components/Overlay';
import { HashPill } from '@/components/HashPill';
import { SourceChip, StatusChip, resultLabel, resultVariant } from '@/components/StatusChip';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/lib/format';
import { useUI } from '@/lib/ui-store';
import type { CheckView } from '@/lib/service';
import { DOC_LABELS, type DocType } from '@/lib/types';

interface Row { field: string; values: Partial<Record<DocType, string | number | null>>; status: 'ok' | 'mismatch' | 'note' }
interface Finding { field: string; docs: string[]; severity: 'mismatch' | 'note'; message: string }
const COLS: DocType[] = ['po', 'invoice', 'packing', 'shippingBill', 'bl'];
const ROW_FIELD: Record<string, string> = { 'Quantity (pcs)': 'quantity', 'Value (USD)': 'amount', Date: 'date', Buyer: 'buyer', Seller: 'seller', 'HS code': 'hsCode', 'Port of loading': 'portLoading', 'Port of discharge': 'portDischarge', Incoterm: 'incoterm', Currency: 'currency' };
const SHORT: Record<DocType, string> = { po: 'PO', invoice: 'Invoice', packing: 'Packing', shippingBill: 'Ship. Bill', bl: 'BL' };

function CompareTable({ rows, findings }: { rows: Row[]; findings: Finding[] }) {
  const bad = (label: string, doc: DocType) => findings.some((f) => f.severity === 'mismatch' && f.field === ROW_FIELD[label] && f.docs.includes(doc));
  return (
    <div className="border border-line rounded-btn overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-canvas text-ink-3"><tr><th className="text-left font-medium px-2 py-1.5">Field</th>{COLS.map((c) => <th key={c} className="text-left font-medium px-2 py-1.5">{SHORT[c]}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className="border-t border-line">
              <td className="px-2 py-1.5 font-medium text-ink-2 whitespace-nowrap">{r.field}</td>
              {COLS.map((c) => {
                const v = r.values[c];
                const m = r.status === 'mismatch' && v !== undefined && v !== null && bad(r.field, c);
                return <td key={c} className={cn('px-2 py-1.5 tabular whitespace-nowrap', m && 'bg-danger-soft text-danger font-semibold', r.status === 'note' && v && 'text-ink')}>{v === undefined || v === null ? <span className="text-ink-3">–</span> : typeof v === 'number' ? v.toLocaleString('en-US') : String(v).length > 26 ? String(v).slice(0, 25) + '…' : String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceDrawer({ check, onClose, onSendToOps, onFix }: { check: CheckView | null; onClose: () => void; onSendToOps?: () => void; onFix?: () => void }) {
  const showStaged = useUI((s) => s.showStagedLabels);
  const [raw, setRaw] = useState(true);
  const rec = check?.record;
  const ev = (rec?.evidence ?? {}) as Record<string, unknown>;
  return (
    <Drawer open={!!check} onClose={onClose} width={check?.checkId === 8 ? 680 : 480} title={check ? `Check ${check.checkId}: ${check.title}` : ''} subtitle="Evidence"
      footer={rec && <div className="flex items-center justify-between gap-3"><span className="text-caption text-ink-3">Evidence reference</span><HashPill value={rec.evidenceHash} label="Evidence reference (SHA-256)" /></div>}>
      {check && !rec && <p className="text-sm text-ink-2">This check has not run yet.</p>}
      {check && rec && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusChip variant={resultVariant(rec.result)} label={resultLabel[rec.result]} />
            <SourceChip source={rec.source} mode={rec.mode} showStaged={showStaged} />
            <span className="text-caption text-ink-3">{fmtDateTime(rec.runAt)}</span>
          </div>
          <p className={cn('text-sm font-medium', rec.result === 'fail' ? 'text-danger' : rec.result === 'warn' ? 'text-warn' : 'text-ink')}>{rec.line}</p>

          {check.checkId === 8 && Array.isArray(ev.table) && (
            <div className="space-y-3">
              {typeof ev.interpretation === 'string' && rec.result === 'fail' && <p className="text-sm bg-warn-soft text-warn rounded-btn px-3 py-2">{ev.interpretation}</p>}
              <CompareTable rows={ev.table as Row[]} findings={(ev.findings as Finding[]) ?? []} />
              <ul className="space-y-1.5">
                {((ev.findings as Finding[]) ?? []).map((f, i) => (
                  <li key={i} className="flex gap-2 text-table">
                    <StatusChip variant={f.severity === 'mismatch' ? 'fail' : 'info'} label={f.severity === 'mismatch' ? 'Mismatch' : 'Note'} className="shrink-0" />
                    <span className={f.severity === 'mismatch' ? 'text-ink' : 'text-ink-2'}>{f.message}</span>
                  </li>
                ))}
              </ul>
              {rec.result === 'fail' && onFix && <Button onClick={onFix} variant="accent">Upload corrected document</Button>}
            </div>
          )}

          {check.checkId === 12 && rec.result === 'fail' && (
            <div className="space-y-2 bg-danger-soft rounded-btn p-3">
              <p className="text-sm text-danger font-medium">This invoice has already been financed through Cashew. Details of the other lender are not shared.</p>
              <div className="grid grid-cols-[110px_1fr] gap-y-1.5 items-center text-caption">
                <span className="text-ink-2">This attempt</span><HashPill value={String(ev.attemptFingerprint)} label="Attempt fingerprint" />
                <span className="text-ink-2">Registry entry</span><HashPill value={String(ev.registryFingerprint)} label="Registry fingerprint" />
              </div>
              <p className="text-caption text-danger font-medium">Fingerprints are equal.</p>
            </div>
          )}
          {check.checkId === 12 && rec.result === 'warn' && !!ev.similarity && <Similarity sim={ev.similarity as SimT} onSendToOps={onSendToOps} />}

          <div>
            <button onClick={() => setRaw(!raw)} className="text-caption font-medium text-ink-2 hover:text-brand mb-1.5">{raw ? 'Hide' : 'Show'} raw evidence JSON</button>
            {raw && <pre className="font-mono text-[11px] leading-4 bg-canvas border border-line rounded-btn p-3 overflow-x-auto max-h-[320px] whitespace-pre">{JSON.stringify(rec.evidence, null, 2)}</pre>}
          </div>
          {check.history > 1 && <p className="text-caption text-ink-3">This check has run {check.history} times. Earlier results are kept in the audit log.</p>}
        </div>
      )}
    </Drawer>
  );
}

interface SimT { overall: number; invoiceNoDistance: number; amountDiffPct: number; dateDiffDays: number; irnEqual: boolean; signals: Record<string, number> }
function Similarity({ sim, onSendToOps }: { sim: SimT; onSendToOps?: () => void }) {
  const rows: [string, string, number | null][] = [
    ['Supplier', 'equal', null], ['Buyer', 'equal', null],
    ['Invoice number', `distance ${sim.invoiceNoDistance}`, sim.signals.invoiceNo],
    ['Amount', `within ${sim.amountDiffPct.toFixed(1)}% of a financed invoice`, sim.signals.amount],
    ['Date', `within ${sim.dateDiffDays} days`, sim.signals.date],
    ['Currency', 'equal', sim.signals.currency],
    ['e-Invoice IRN', sim.irnEqual ? 'equal' : 'different', sim.signals.irn],
  ];
  return (
    <div className="space-y-3">
      <div className="border border-warn/40 rounded-btn overflow-hidden">
        <table className="w-full text-table">
          <thead className="bg-warn-soft text-warn"><tr><th className="text-left px-3 py-1.5 font-medium">Signal</th><th className="text-left px-3 py-1.5 font-medium">Result</th><th className="text-right px-3 py-1.5 font-medium">Points</th></tr></thead>
          <tbody>
            {rows.map(([k, v, p]) => <tr key={k} className="border-t border-line"><td className="px-3 py-1.5">{k}</td><td className="px-3 py-1.5 text-ink-2">{v}</td><td className="px-3 py-1.5 text-right tabular font-mono text-[12px]">{p === null ? 'filter' : p.toFixed(2)}</td></tr>)}
            <tr className="border-t border-line bg-canvas font-semibold"><td className="px-3 py-1.5">Overall</td><td className="px-3 py-1.5 text-ink-2">threshold 0.80</td><td className="px-3 py-1.5 text-right tabular font-mono">{sim.overall.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      {onSendToOps && <Button variant="secondary" onClick={onSendToOps}>Send to Ops review</Button>}
    </div>
  );
}
