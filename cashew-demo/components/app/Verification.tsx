'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { CheckRow } from '@/components/CheckRow';
import { Drawer } from '@/components/Drawer';
import { HashPill } from '@/components/HashPill';
import { StatusChip } from '@/components/StatusChip';
import type { StatusKind } from '@/components/status';
import { useUi } from '@/lib/client/uiStore';
import { formatUSD } from '@/lib/format';
import { formatDateTime } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Callout, Rows } from './parts';

export type EvidenceRow = {
  checkId: number; title: string; source: string; mode: 'staged' | 'real'; state: 'waiting' | 'running' | 'done';
  result?: 'pass' | 'fail' | 'unknown' | 'pending'; flag?: string; line?: string; evidence?: any; evidenceHash?: string; runAt?: string; durationMs?: number; versions: number;
};

function rowDisplay(row: EvidenceRow): { kind: StatusKind; label?: string; line: string } {
  if (row.state === 'running') return { kind: 'running', line: 'Checking now.' };
  if (row.state === 'waiting') return { kind: 'pending', label: 'Waiting', line: 'Not run yet.' };
  if (row.flag === 'possible-duplicate') return { kind: 'warn', label: 'Possible duplicate', line: row.line! };
  return { kind: row.result!, line: row.line! };
}

export function useSourceLabel() {
  const staged = useUi((s) => s.stagedLabels);
  return (row: Pick<EvidenceRow, 'source' | 'mode'>) => {
    if (row.mode === 'real') return row.source;
    return staged ? `${row.source} (simulated)` : row.source;
  };
}

function ComparisonTable({ result }: { result: any }) {
  const cell = (row: any, field: string) => cn(row.mismatched.includes(field) && 'bg-fail-soft font-semibold text-fail');
  return (
    <div className="overflow-x-auto border border-rule">
      <table className="ledger w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="field-label">Document</th>
            <th scope="col" className="field-label">Quantity</th>
            <th scope="col" className="field-label">Value</th>
            <th scope="col" className="field-label">Buyer</th>
          </tr>
        </thead>
        <tbody>
          {result.table.map((row: any) => (
            <tr key={row.doc}>
              <th scope="row" className="font-medium text-ink-2">{row.name}</th>
              <td className={cn('tabular whitespace-nowrap', cell(row, 'quantity'))}>{row.quantity !== undefined ? `${new Intl.NumberFormat('en-IN').format(row.quantity)} pcs` : '—'}{row.mismatched.includes('quantity') && <span className="sr-only"> (does not match)</span>}</td>
              <td className={cn('tabular whitespace-nowrap', cell(row, 'amount'))}>{row.amount !== undefined ? formatUSD(row.amount) : '—'}</td>
              <td className={cell(row, 'buyer')}>{row.buyer ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimilarityTable({ similarity }: { similarity: any }) {
  const irn = similarity.signals.find((s: any) => s.key === 'irn').closeness === 1;
  const currency = similarity.signals.find((s: any) => s.key === 'currency').closeness === 1;
  const rows: Array<[string, string]> = [
    ['Supplier', 'Equal'],
    ['Buyer', 'Equal'],
    ['Invoice number', `Distance ${similarity.invoiceNoDistance}`],
    ['Amount', `Within ${similarity.amountGapPct}% of a financed invoice`],
    ['Date', `Within ${similarity.dayGap} days`],
    ['Currency', currency ? 'Equal' : 'Different'],
    ['e-Invoice IRN', irn ? 'Equal' : 'Different'],
  ];
  return (
    <div className="border border-rule">
      <table className="ledger w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row" className="font-medium text-ink-2">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="font-semibold">Overall similarity</th>
            <td className="tabular text-money">{similarity.overall.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceDrawer({ row, onClose, onSendToOps, alreadySent }: { row?: EvidenceRow; onClose: () => void; onSendToOps?: () => void; alreadySent?: boolean }) {
  const source = useSourceLabel();
  const display = row && rowDisplay(row);
  const evidence = row?.evidence;
  const isExact = row?.checkId === 12 && evidence?.code === 'FINANCED_BY_OTHER';
  const isFuzzy = row?.checkId === 12 && evidence?.code === 'POSSIBLE_DUPLICATE';
  return (
    <Drawer
      open={Boolean(row)}
      onClose={onClose}
      title={row ? `Check ${row.checkId}: ${row.title}` : ''}
      footer={row?.evidenceHash ? <div className="flex w-full flex-wrap items-center justify-between gap-2"><span className="field-label">Evidence reference</span><HashPill hash={row.evidenceHash} label="evidence reference" /></div> : undefined}
    >
      {row && display && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip kind={display.kind}>{display.label}</StatusChip>
            <span className="rounded-control border border-rule px-1.5 py-0.5 font-mono text-label text-ink-2">{source(row)}</span>
            {row.versions > 1 && <span className="text-table text-ink-2">Run {row.versions} times. Earlier results are kept.</span>}
          </div>
          <p className="font-semibold">{display.line}</p>
          {row.runAt && <p className="tabular text-table text-ink-2">Checked {formatDateTime(row.runAt)}</p>}

          {row.checkId === 8 && evidence?.table && (
            <>
              <ComparisonTable result={evidence} />
              {evidence.mismatches.length > 1 && (
                <div>
                  <p className="field-label mb-1">Also found</p>
                  <ul className="list-disc pl-5 text-table">{evidence.mismatches.slice(1).map((m: any) => <li key={m.message}>{m.message}</li>)}</ul>
                </div>
              )}
              {evidence.notes.length > 0 && (
                <div>
                  <p className="field-label mb-1">Notes</p>
                  <ul className="list-disc pl-5 text-table">{evidence.notes.map((n: any) => <li key={n.message}>{n.message}</li>)}</ul>
                </div>
              )}
            </>
          )}

          {isExact && (
            <Callout tone="fail" title="This invoice has already been financed through Cashew.">
              <p>Details of the other lender are not shared.</p>
              <dl className="mt-2 flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><dt>This attempt</dt><dd><HashPill hash={evidence.fingerprint} label="attempt fingerprint" /></dd></div>
                <div className="flex flex-wrap items-center justify-between gap-2"><dt>Registry</dt><dd><HashPill hash={evidence.matchedFingerprint} label="registry fingerprint" /></dd></div>
              </dl>
              {evidence.fingerprint === evidence.matchedFingerprint && <p className="mt-2 font-semibold">The fingerprints are equal.</p>}
            </Callout>
          )}

          {isFuzzy && (
            <>
              <SimilarityTable similarity={evidence.similarity} />
              {onSendToOps && (alreadySent ? <Callout tone="unknown" title="Sent to Ops review." /> : <div><Button variant="primary" onClick={onSendToOps}>Send to Ops review</Button></div>)}
            </>
          )}

          {evidence && (
            <div>
              <p className="field-label mb-1">Raw evidence</p>
              <pre className="max-h-72 overflow-auto border border-rule bg-paper p-3 font-mono text-label">{JSON.stringify(evidence, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

export function SummaryStrip({ summary }: { summary: { pass: number; fail: number; unknown: number; pending: number } }) {
  return (
    <p role="status" className="tabular border-b-2 border-ink pb-2 font-semibold">
      {summary.pass} passed, {summary.unknown} unknown, {summary.fail} failed, {summary.pending} pending
    </p>
  );
}

export function VerificationList({ bundle, onSendToOps, alreadySent }: { bundle?: any; onSendToOps?: () => void; alreadySent?: boolean }) {
  const source = useSourceLabel();
  const [openId, setOpenId] = useState<number>();
  const arriving = useRef(new Set<number>());
  const seen = useRef(new Map<number, string>());

  useEffect(() => {
    if (!bundle) return;
    for (const row of bundle.checks as EvidenceRow[]) {
      if (row.state === 'done' && seen.current.get(row.checkId) === 'running') arriving.current.add(row.checkId);
      seen.current.set(row.checkId, row.state);
    }
  }, [bundle]);

  if (!bundle) return <Rows count={8} />;
  const rows = bundle.checks as EvidenceRow[];
  const open = rows.find((r) => r.checkId === openId);

  return (
    <div className="flex flex-col gap-3">
      <SummaryStrip summary={bundle.summary} />
      <div className="border border-rule border-t-0">
        {rows.map((row) => {
          const display = rowDisplay(row);
          return (
            <CheckRow
              key={row.checkId}
              title={`${row.checkId}. ${row.title}`}
              source={source(row)}
              result={display.line}
              status={display.kind}
              statusLabel={display.label}
              duration={row.state === 'done' && row.durationMs ? `${(row.durationMs / 1000).toFixed(1)}s` : undefined}
              drawTick={arriving.current.has(row.checkId)}
              onOpen={row.state === 'done' ? () => setOpenId(row.checkId) : undefined}
            />
          );
        })}
      </div>
      <EvidenceDrawer row={open} onClose={() => setOpenId(undefined)} onSendToOps={onSendToOps} alreadySent={alreadySent} />
    </div>
  );
}
