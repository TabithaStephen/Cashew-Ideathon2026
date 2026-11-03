'use client';
import { useRouter } from 'next/navigation';
import { TradeStatusChip } from '@/components/StatusChip';
import { exportValue, ago } from '@/lib/format';
import type { TradeRowT } from '@/lib/client-types';

export function TradesTable({ rows, href }: { rows: TradeRowT[]; href: (r: TradeRowT) => string | null }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-table">
        <thead><tr className="text-left text-caption text-ink-3 border-b border-line">
          <th className="font-medium py-2.5 px-4">Trade ID</th><th className="font-medium py-2.5 px-4">Buyer</th><th className="font-medium py-2.5 px-4">Value</th>
          <th className="font-medium py-2.5 px-4">Status</th><th className="font-medium py-2.5 px-4">Last updated</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const h = href(r);
            return (
              <tr key={r.id} tabIndex={h ? 0 : -1} onClick={() => h && router.push(h)} onKeyDown={(e) => { if (e.key === 'Enter' && h) router.push(h); }}
                className={`border-b border-line last:border-b-0 ${h ? 'cursor-pointer hover:bg-brand-soft/40' : ''}`}>
                <td className="py-3 px-4"><span className="font-mono text-mono bg-canvas border border-line rounded-full px-2.5 py-1 whitespace-nowrap">{r.id}</span></td>
                <td className="py-3 px-4"><p className="font-medium text-ink">{r.buyer}</p><p className="text-caption text-ink-3">{r.invoiceNo}</p></td>
                <td className="py-3 px-4 tabular whitespace-nowrap">{exportValue(r.value, r.fx)}</td>
                <td className="py-3 px-4"><TradeStatusChip status={r.status} /></td>
                <td className="py-3 px-4 text-ink-3 whitespace-nowrap">{ago(r.updatedAt)}{r.historical ? ' · history' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
