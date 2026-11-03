'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { TradesTable } from '@/components/trade/TradesTable';
import { useApi } from '@/lib/client';
import type { TradeRowT } from '@/lib/client-types';

export default function TradesPage() {
  const { data } = useApi<TradeRowT[]>('/api/trades', 2000);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between"><div><h1>Trades</h1><p className="text-ink-2">Active trades and your verified history.</p></div>
        <Link href="/app/trades/new"><Button icon={<Plus size={16} />}>New trade</Button></Link></div>
      <Card className="p-0 overflow-hidden">
        {data && !data.length ? <EmptyState text="No trades yet. Start with your first invoice." action={<Link href="/app/trades/new"><Button>New trade</Button></Link>} />
          : <TradesTable rows={data ?? []} href={(r) => (r.historical ? null : `/app/trades/${r.id}`)} />}
      </Card>
    </div>
  );
}
