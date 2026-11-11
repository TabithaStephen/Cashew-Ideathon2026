'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusChip } from '@/components/StatusChip';
import { formatExportValue, formatINR } from '@/lib/format';
import { formatDate, STATUS_DISPLAY } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { TradeStatus } from '@/lib/types';

export function PageHead({ title, intro, action }: { title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-display">{title}</h1>
        {intro && <p className="mt-1 max-w-[68ch] text-ink-2">{intro}</p>}
      </div>
      {action}
    </header>
  );
}

export const TradeStatusChip = ({ status }: { status: TradeStatus }) => <StatusChip kind={STATUS_DISPLAY[status].kind}>{STATUS_DISPLAY[status].label}</StatusChip>;

export function TradeValue({ value, fx, currency = 'USD' }: { value: number; fx: number; currency?: string }) {
  return <span className="tabular">{currency === 'USD' ? formatExportValue(value, fx) : formatINR(value * fx)}</span>;
}

export function Rows({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="panel">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-rule p-4 last:border-b-0">
          <span className="h-3.5 w-1/4 bg-pending-soft" />
          <span className="h-3.5 flex-1 bg-pending-soft" />
        </div>
      ))}
    </div>
  );
}

export function Callout({ tone, title, children, action }: { tone: 'fail' | 'warn' | 'pass' | 'unknown'; title?: string; children?: ReactNode; action?: ReactNode }) {
  const styles = {
    fail: 'border-fail bg-fail-soft',
    warn: 'border-warn bg-warn-soft',
    pass: 'border-pass bg-pass-soft',
    unknown: 'border-unknown bg-unknown-soft',
  };
  return (
    <div className={cn('border-l-4 p-4', styles[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn('text-table', title && 'mt-1')}>{children}</div>}
      {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function KeyValues({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="field-label pt-1">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TradesTable({ trades, hrefBase = '/app/trades' }: { trades: any[]; hrefBase?: string }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="ledger w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="field-label">Trade ID</th>
            <th scope="col" className="field-label">Buyer</th>
            <th scope="col" className="field-label">Value</th>
            <th scope="col" className="field-label">Status</th>
            <th scope="col" className="field-label">Updated</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="transition-colors duration-fast hover:bg-paper">
              <th scope="row" className="font-normal">
                <Link href={`${hrefBase}/${trade.id}`} className="flex min-h-7 items-center whitespace-nowrap font-mono text-label underline underline-offset-4 max-md:min-h-11">{trade.id}</Link>
              </th>
              <td>{trade.buyerName}</td>
              <td><TradeValue value={trade.value} fx={trade.fx} /></td>
              <td><TradeStatusChip status={trade.status} /></td>
              <td className="tabular whitespace-nowrap text-ink-2">{formatDate(trade.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StrengthPanel({ risk, openChecks }: { risk?: any; openChecks?: number }) {
  if (!risk) return <div className="panel p-4 text-ink-2">Evidence strength appears after verification runs.</div>;
  const tone = risk.band === 'Strong' ? 'text-pass' : risk.band === 'Moderate' ? 'text-warn' : 'text-fail';
  return (
    <div data-tour="strength" className="panel p-4">
      <p className="field-label">Evidence strength</p>
      <p className={cn('tabular mt-1 text-money', tone)}>{risk.band} <span className="text-ink-2">{risk.strength.toFixed(1)} of 100</span></p>
      {openChecks !== undefined && openChecks > 0 && <p className="mt-1 text-table text-ink-2">{openChecks} {openChecks === 1 ? 'check is' : 'checks are'} still open.</p>}
      {risk.blocking.length > 0 && <p className="mt-1 text-table font-semibold text-fail">Blocking issue on check {risk.blocking.join(', ')}. The band is capped at Limited.</p>}
    </div>
  );
}

