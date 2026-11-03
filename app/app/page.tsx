'use client';
import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardHeader, Skeleton } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { TradesTable } from '@/components/trade/TradesTable';
import { useApi } from '@/lib/client';
import type { TradeRowT, Workspace } from '@/lib/client-types';
import { useMe } from '@/lib/session';
import { indianGroup } from '@/lib/format';
import type { PassportCredential } from '@/lib/engines/passport';

const ACTIVE_DONE = ['REPAID', 'CLOSED', 'WITHDRAWN', 'REJECTED_VERIFICATION'];

export default function Dashboard() {
  const me = useMe();
  const trades = useApi<TradeRowT[]>('/api/trades', 2000);
  const orgId = me.data?.session?.orgId;
  const passport = useApi<{ credential: PassportCredential }>(orgId ? `/api/passport/${orgId}` : null, 5000);
  const rows = trades.data ?? [];
  const active = rows.filter((r) => !r.historical && !ACTIVE_DONE.includes(r.status));
  const latest = rows.find((r) => !r.historical);
  const ws = useApi<Workspace>(latest ? `/api/trades/${latest.id}` : null, 2000);
  const financed = rows.filter((r) => r.advanceInr).reduce((s, r) => s + (r.advanceInr ?? 0), 0);
  const tier = passport.data?.credential.claims.tier;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div><h1>Dashboard</h1><p className="text-ink-2">{me.data?.org?.legalName} · {me.data?.org?.city}</p></div>
        <Link href="/app/trades/new"><Button icon={<Plus size={16} />}>New trade</Button></Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active trades" numeric={active.length} format={(n) => String(Math.round(n))} delta={`${rows.filter((r) => r.historical).length} completed before`} />
        <StatCard label="Total financed" numeric={financed} format={(n) => `₹${indianGroup(Math.round(n))}`} delta="Advances received via Cashew" tone="success" />
        <StatCard label="Average time to first offer" value={<AvgFirstOffer rows={rows} />} delta="From consent to first sealed offer" />
        <StatCard label="Passport tier" value={tier !== undefined ? `Tier ${tier}` : '–'} delta={tier !== undefined && tier < 3 ? 'Repay one more trade on time for Tier 3' : 'Highest tier'} tone={tier === 3 ? 'success' : 'warn'} />
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <Card className="p-0 overflow-hidden">
          <div className="px-6 pt-6"><CardHeader title="Trades" subtitle="Click a row to open its workspace." right={<Link className="text-sm text-brand font-medium hover:underline" href="/app/trades">View all</Link>} /></div>
          {trades.loading && !trades.data ? <div className="p-6 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            : active.length === 0 && !rows.length ? <EmptyState text="No trades yet. Start with your first invoice." action={<Link href="/app/trades/new"><Button>New trade</Button></Link>} />
            : <>
                {active.length === 0 && <EmptyState className="py-8" text="No trades yet. Start with your first invoice." action={<Link href="/app/trades/new"><Button>New trade</Button></Link>} />}
                <TradesTable rows={rows.slice(0, 8)} href={(r) => (r.historical ? null : `/app/trades/${r.id}`)} />
              </>}
        </Card>
        <Card className="lg:sticky lg:top-[112px]">
          <p className="text-caption text-ink-3">Next step</p>
          {latest && ws.data?.nextAction ? (
            <>
              <h3 className="text-h3 mt-1">{ws.data.nextAction.title}</h3>
              <p className="text-sm text-ink-2 mt-1">{ws.data.nextAction.body}</p>
              <p className="text-caption text-ink-3 mt-3 font-mono">{latest.id} · {latest.buyer}</p>
              <Link href={ws.data.nextAction.href ?? `/app/trades/${latest.id}${ws.data.nextAction.tab ? `?tab=${ws.data.nextAction.tab}` : ''}`}>
                <Button className="mt-4 w-full" icon={<ArrowRight size={16} />}>Continue</Button>
              </Link>
            </>
          ) : (
            <><h3 className="text-h3 mt-1">Finance your next invoice</h3><p className="text-sm text-ink-2 mt-1">Upload five documents. Fourteen checks run in about 12 seconds.</p>
              <Link href="/app/trades/new"><Button className="mt-4 w-full">Start a trade</Button></Link></>
          )}
        </Card>
      </div>
    </div>
  );
}

function AvgFirstOffer({ rows }: { rows: TradeRowT[] }) {
  const ids = rows.filter((r) => !r.historical && r.requestedAt).map((r) => r.id);
  const first = useApi<{ offers: { offer: { submittedAt: string } }[] }>(ids[0] ? `/api/trades/${ids[0]}/offers` : null, 3000);
  const req = rows.find((r) => r.id === ids[0])?.requestedAt;
  const times = (first.data?.offers ?? []).map((o) => new Date(o.offer.submittedAt).getTime());
  if (!req || !times.length) return <>–</>;
  const s = Math.max(0, Math.round((Math.min(...times) - new Date(req).getTime()) / 1000));
  return <>{s} s</>;
}
