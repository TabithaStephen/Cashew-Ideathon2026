'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusChip, TradeStatusChip } from '@/components/StatusChip';
import { Tabs } from '@/components/Tabs';
import { bandVariant } from '@/components/trade/EvidenceStrength';
import { useApi } from '@/lib/client';
import type { TradeRowT } from '@/lib/client-types';
import { ago, exportValue } from '@/lib/format';
import { useMe } from '@/lib/session';

type T = 'new' | 'offered' | 'financed';
export default function Inbox() {
  const me = useMe();
  const router = useRouter();
  const [tab, setTab] = useState<T>('new');
  const { data } = useApi<TradeRowT[]>('/api/trades', 1500);
  const rows = data ?? [];
  const groups: Record<T, TradeRowT[]> = {
    new: rows.filter((r) => r.offerStatus === 'Not responded' && r.status === 'OFFERS_OPEN'),
    offered: rows.filter((r) => ['Offer sent', 'Accepted', 'Not selected', 'Declined'].includes(r.offerStatus ?? '') && !r.financedByMe),
    financed: rows.filter((r) => r.financedByMe),
  };
  const list = groups[tab];
  return (
    <div className="space-y-6">
      <div><h1>Inbox</h1><p className="text-ink-2">{me.data?.org?.legalName}: verified trades shared with you under an active consent.</p></div>
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'new', label: 'New', badge: <Count n={groups.new.length} /> }, { id: 'offered', label: 'Offered', badge: <Count n={groups.offered.length} /> },
        { id: 'financed', label: 'Financed', badge: <Count n={groups.financed.length} /> }]} />
      <Card className="p-0 overflow-hidden">
        {!list.length ? <EmptyState text={tab === 'new' ? 'No new trades. Trades appear here only when an exporter consents to share them with you.' : tab === 'offered' ? 'No offers sent yet.' : 'Nothing financed yet.'} /> : (
          <div className="overflow-x-auto"><table className="w-full text-table">
            <thead><tr className="text-left text-caption text-ink-3 border-b border-line">{['Trade ID', 'Exporter', 'Buyer', 'Value', 'Corridor', 'Evidence', 'Requested', 'Offer status'].map((h) => <th key={h} className="font-medium py-2.5 px-4">{h}</th>)}</tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} tabIndex={0} onClick={() => router.push(`/lender/trades/${r.id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/lender/trades/${r.id}`)} className="border-b border-line last:border-0 cursor-pointer hover:bg-brand-soft/40">
                <td className="py-3 px-4"><span className="font-mono text-mono bg-canvas border border-line rounded-full px-2.5 py-1 whitespace-nowrap">{r.id}</span></td>
                <td className="py-3 px-4 font-medium">{r.exporter}</td>
                <td className="py-3 px-4">{r.buyer}</td>
                <td className="py-3 px-4 tabular whitespace-nowrap">{exportValue(r.value, r.fx)}</td>
                <td className="py-3 px-4">{r.corridor}</td>
                <td className="py-3 px-4">{r.band ? <StatusChip variant={bandVariant(r.band)} label={r.band} /> : '–'}</td>
                <td className="py-3 px-4 text-ink-3 whitespace-nowrap">{r.requestedAt ? ago(r.requestedAt) : '–'}</td>
                <td className="py-3 px-4">{tab === 'financed' ? <TradeStatusChip status={r.status} /> : <StatusChip variant={r.offerStatus === 'Accepted' ? 'pass' : r.offerStatus === 'Offer sent' ? 'info' : r.offerStatus === 'Not selected' || r.offerStatus === 'Declined' ? 'neutral' : 'pending'} label={r.offerStatus} />}</td>
              </tr>))}</tbody>
          </table></div>)}
      </Card>
      <p className="text-caption text-ink-3">Access rule: a trade is visible only while the exporter's consent for your organisation is active, unexpired and unrevoked.</p>
    </div>
  );
}
const Count = ({ n }: { n: number }) => <span className="text-[11px] tabular bg-canvas border border-line rounded-full px-1.5">{n}</span>;
