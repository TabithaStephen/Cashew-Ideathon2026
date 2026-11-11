'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { PageHead, Rows, TradesTable } from '@/components/app/parts';
import { useApi } from '@/lib/client/api';
import { formatINR } from '@/lib/format';
import { nextStep } from '@/components/app/nextStep';

export default function Dashboard() {
  const router = useRouter();
  const { data, error, refresh } = useApi<any>('trades');
  const { data: me } = useApi<any>('orgs/me', 2000);

  if (error && !data) {
    return (
      <div role="alert" className="panel flex flex-col items-start gap-3 p-6">
        <p>Couldn’t load your trades. Your documents are safe.</p>
        <Button onClick={() => refresh()}>Try again</Button>
      </div>
    );
  }
  const trades: any[] = data?.trades ?? [];
  const live = trades.filter((t) => !t.history);
  const activeCount = live.filter((t) => !['REPAID', 'CLOSED', 'REJECTED_VERIFICATION', 'WITHDRAWN'].includes(t.status)).length;
  const financed = trades.filter((t) => t.history || t.commit).reduce((sum, t) => sum + t.valueInr, 0);
  const latest = live.find((t) => !t.seededRace) ?? live[0];
  const step = latest && nextStep(latest);
  const firstOffer: number[] = live.filter((t) => t.firstOfferSeconds !== undefined && !t.seededRace).map((t) => t.firstOfferSeconds);

  return (
    <>
      <PageHead title="Dashboard" action={<Button variant="primary" asChild><Link href="/app/trades/new">New trade</Link></Button>} />
      {!data ? (
        <Rows />
      ) : trades.length === 0 ? (
        <EmptyState message="No trades yet. Start with your first invoice." actionLabel="New trade" onAction={() => router.push('/app/trades/new')} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active trades" value={activeCount} />
            <StatCard label="Total financed" value={financed} format={formatINR} countUp />
            <StatCard label="Average time to first offer" value={firstOffer.length ? `${(firstOffer.reduce((a, b) => a + b, 0) / firstOffer.length).toFixed(1)} s` : 'No offers yet'} delta={firstOffer.length ? 'Lender responses are simulated' : undefined} />
            <StatCard label="Passport tier" value={me?.org?.tier !== undefined ? `Tier ${me.org.tier}` : '—'} />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-labelledby="trades-title" className="min-w-0">
              <h2 id="trades-title" className="mb-2">Trades</h2>
              <TradesTable trades={trades} />
            </section>
            <aside className="panel p-4">
              <p className="field-label">Next step</p>
              {step ? (
                <>
                  <p className="mt-1 font-mono text-label text-ink-2">{latest.id}</p>
                  <p className="mt-1">{step.text}</p>
                  {step.href && <Button variant="primary" className="mt-3 w-full" asChild><Link href={step.href}>{step.action}</Link></Button>}
                </>
              ) : (
                <>
                  <p className="mt-1">Start your next trade with its invoice.</p>
                  <Button variant="primary" className="mt-3 w-full" asChild><Link href="/app/trades/new">New trade</Link></Button>
                </>
              )}
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
