'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { HashPill } from '@/components/HashPill';
import { Timeline } from '@/components/Timeline';
import { Callout, KeyValues, PageHead, Rows, StrengthPanel, TradeStatusChip, TradeValue } from '@/components/app/parts';
import { OfferComparison } from '@/components/app/Offers';
import { VerificationList } from '@/components/app/Verification';
import { nextStep } from '@/components/app/nextStep';
import { DocumentsView } from '@/components/app/DocumentsView';
import { TransactionFlow } from '@/components/app/TransactionFlow';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatINR } from '@/lib/format';
import { formatDate, formatDateTime, tradeMilestones } from '@/lib/ui';
import { cn } from '@/lib/utils';

const TABS = [['overview', 'Overview'], ['documents', 'Documents'], ['verification', 'Verification'], ['offers', 'Offers'], ['financing', 'Financing'], ['tracking', 'Tracking'], ['activity', 'Activity']] as const;
type Tab = (typeof TABS)[number][0];
const STAGES = ['Loaded', 'Sailed', 'Arrived', 'Delivered'];

function Financing({ trade }: { trade: any }) {
  const offer = trade.acceptedOffer;
  if (!offer) return <div className="panel px-4 py-8">No offer accepted yet.</div>;
  const dueAt = trade.commit ? new Date(Date.parse(trade.commit.timestamp) + offer.tenureDays * 86_400_000).toISOString() : undefined;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><TransactionFlow trade={trade} /></div>
      <section className="panel p-4">
        <h2 className="mb-2">Accepted offer</h2>
        <KeyValues rows={[['Lender', offer.lenderName], ['Product', offer.productName], ['Advance', <span key="a" className="tabular">{offer.advancePct}% = {formatINR(offer.advance)}</span>], ['Effective cost', <span key="e" className="tabular font-semibold">{offer.effectiveApr.toFixed(2)}% a year</span>], ['Net cash', <span key="n" className="tabular font-semibold">{formatINR(offer.netCash)}</span>]]} />
      </section>
      <section className="panel p-4">
        <h2 className="mb-2">E-sign</h2>
        {trade.signedAt ? <p>Signed {formatDateTime(trade.signedAt)} with OTP (simulated).</p> : <p>Not signed yet.</p>}
        {trade.status === 'CONTRACT_SIGNED' && !trade.commitBlocked && <p role="status" className="mt-2 font-semibold">Disbursing (simulated)…</p>}
      </section>
      <section className="panel p-4">
        <h2 className="mb-2">Registry receipt</h2>
        {trade.commit ? (
          <div className="flex flex-col items-start gap-2">
            <HashPill hash={trade.commit.fingerprint} label="invoice fingerprint" />
            <p>Recorded in the duplicate-financing registry.</p>
            <p className="tabular text-table text-ink-2">Position {trade.commit.position}, {formatDateTime(trade.commit.timestamp)}</p>
          </div>
        ) : trade.commitBlocked ? (
          <Callout tone="fail" title="The registry blocked this financing.">This invoice has already been financed through Cashew. Details of the other lender are not shared.</Callout>
        ) : <p className="text-ink-2">Written when the financing is committed.</p>}
      </section>
      <section className="panel p-4">
        <h2 className="mb-2">Repayment schedule</h2>
        {trade.repaidAt ? <p className="font-semibold text-pass">Repaid {formatDate(trade.repaidAt)}.</p> : <KeyValues rows={[['Due', dueAt ? formatDate(dueAt) : `${offer.tenureDays} days after disbursal`], ['Buyer pays', <span key="r" className="tabular">{formatINR(offer.invoiceValueInr)}</span>], ['Paid by', trade.buyerName]]} />}
      </section>
    </div>
  );
}

function Tracking({ trade }: { trade: any }) {
  const { run, busy } = useAction();
  const items = STAGES.map((title, i) => {
    const log = trade.shipmentLog.find((l: any) => l.stage === i + 1);
    const stage = i + 1;
    return { title, at: log ? formatDateTime(log.at) : undefined, detail: log ? `Confirmed by ${log.by}` : undefined, state: stage <= trade.shipmentStage ? ('done' as const) : stage === trade.shipmentStage + 1 ? ('current' as const) : ('upcoming' as const) };
  });
  return (
    <div className="panel flex flex-col gap-4 p-4">
      <p className="text-table text-ink-2">Shipment tracking is simulated.</p>
      <Timeline items={items} label="Shipment milestones" />
      {trade.commit && trade.shipmentStage < 4 && <div><Button variant="primary" loading={busy} onClick={() => run(() => api(`trades/${trade.id}/milestones`, { method: 'POST' }))}>Confirm goods delivered</Button></div>}
    </div>
  );
}

function Activity({ trade }: { trade: any }) {
  const { data } = useApi<any>(`trades/${trade.id}/audit`);
  const { run } = useAction();
  if (!data) return <Rows />;
  return (
    <div className="flex flex-col gap-4">
      {data.consents.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-2">Consent artefacts</h2>
          <ul className="flex flex-col gap-2">
            {data.consents.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2 last:border-0 last:pb-0">
                <span>{c.recipient}: {c.purpose}. {c.revokedAt ? `Revoked ${formatDate(c.revokedAt)}.` : `Valid until ${formatDate(c.expiresAt)}.`}</span>
                {!c.revokedAt && <Button size="compact" onClick={() => run(() => api(`consents/${c.id}`, { method: 'DELETE' }))}>Revoke</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="panel overflow-x-auto">
        <table className="ledger w-full border-collapse">
          <thead><tr><th scope="col" className="field-label">When</th><th scope="col" className="field-label">Who</th><th scope="col" className="field-label">What</th></tr></thead>
          <tbody>
            {data.events.map((event: any) => (
              <tr key={event.id}><td className="tabular whitespace-nowrap text-ink-2">{formatDateTime(event.timestamp)}</td><td>{event.actor}</td><td className="font-mono text-label">{event.action}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TradeWorkspace({ params }: { params: { id: string } }) {
  const { data: trade, error } = useApi<any>(`trades/${params.id}`, 500);
  const [tab, setTab] = useState<Tab>('overview');
  const { data: bundle } = useApi<any>(tab === 'verification' || tab === 'overview' ? `trades/${params.id}/evidence` : null, 500);
  const { run } = useAction();

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some(([key]) => key === wanted)) setTab(wanted as Tab);
  }, []);

  const choose = (key: Tab) => {
    setTab(key);
    window.history.replaceState(null, '', `/app/trades/${params.id}?tab=${key}`);
  };

  if (error && !trade) {
    return (
      <div role="alert" className="panel flex flex-col items-start gap-3 p-6">
        <p>{error.message}</p>
        <Button asChild><Link href="/app">Back to dashboard</Link></Button>
      </div>
    );
  }
  if (!trade) return <Rows count={6} />;

  const step = nextStep(trade);
  const sent = trade.openCases.some((c: any) => c.reason === 'Possible duplicate');
  const openChecks = bundle?.checks.filter((c: any) => c.state === 'done' && c.result !== 'pass').length;

  return (
    <>
      <PageHead
        title={trade.buyerName}
        intro={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-mono text-label">{trade.id}</span><TradeValue value={trade.value} fx={trade.fx} /><TradeStatusChip status={trade.status} /></span>}
      />
      <div className="panel mb-4 p-4"><Timeline items={tradeMilestones(trade.status)} orientation="horizontal" label="Trade progress" /></div>
      <nav aria-label="Trade sections" className="mb-4 flex overflow-x-auto border-b border-ink">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => choose(key)} className={cn('min-h-11 flex-none whitespace-nowrap px-3 transition-colors duration-fast hover:bg-sheet', tab === key ? 'font-semibold shadow-[inset_0_-3px_0_var(--ink)]' : 'text-ink-2')}>{label}</button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="panel p-4">
            <h2 className="mb-2">Summary</h2>
            {trade.history && <p className="mb-2 text-table text-ink-2">Completed before this demo. Its documents aren’t included in the sample data.</p>}
            <KeyValues rows={[['Exporter', trade.smeName], ['Buyer', trade.buyerName], ['Invoice', trade.invoiceNo ?? '—'], ['Goods', trade.goods], ['HS code', trade.hsCode], ['Corridor', trade.corridor], ['Terms', `${trade.incoterm}, ${trade.paymentTermsDays} days`]]} />
          </section>
          <div className="flex flex-col gap-4">
            <section className="panel p-4">
              <p className="field-label">Next action</p>
              <p className="mt-1">{step.text}</p>
              {step.href && !step.href.endsWith(`tab=${tab}`) && <Button variant="primary" className="mt-3" asChild><Link href={step.href} onClick={(e) => { const m = step.href!.match(/tab=(\w+)/); if (m && step.href!.includes('/app/trades/' + trade.id + '?')) { e.preventDefault(); choose(m[1] as Tab); } }}>{step.action}</Link></Button>}
            </section>
            <StrengthPanel risk={trade.risk} openChecks={openChecks} />
          </div>
        </div>
      )}
      {tab === 'documents' && <DocumentsView docs={trade.docs} />}
      {tab === 'verification' && (bundle?.started ? (
        <VerificationList bundle={bundle} onSendToOps={() => run(() => api(`trades/${trade.id}/ops-review`, { method: 'POST' }))} alreadySent={sent} />
      ) : bundle ? <div className="panel px-4 py-8">Verification hasn’t run on this trade.</div> : <Rows count={8} />)}
      {tab === 'offers' && <OfferComparison trade={trade} onFinanced={() => choose('financing')} />}
      {tab === 'financing' && <Financing trade={trade} />}
      {tab === 'tracking' && <Tracking trade={trade} />}
      {tab === 'activity' && <Activity trade={trade} />}
    </>
  );
}
