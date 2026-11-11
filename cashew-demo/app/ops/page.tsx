'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/StatusChip';
import { Callout, KeyValues, PageHead, Rows, TradeStatusChip, TradeValue } from '@/components/app/parts';
import { VerificationList } from '@/components/app/Verification';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatDateTime } from '@/lib/ui';
import { cn } from '@/lib/utils';

const TABS = [['queue', 'Review queue'], ['audit', 'Audit log'], ['matching', 'Offer requests'], ['events', 'Events'], ['health', 'Health']] as const;
const INTEGRATIONS = ['GST', 'MCA', 'IEC', 'Sanctions', 'Carrier', 'Buyer registry', 'E-sign'];
const DECISIONS = [
  ['confirm-duplicate', 'Confirm duplicate', 'danger'],
  ['clear', 'Clear, not a duplicate', 'primary'],
  ['ask-info', 'Ask exporter for more info', 'secondary'],
] as const;
const age = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
};

function CaseDetail({ item }: { item: any }) {
  const { data: bundle } = useApi<any>(`trades/${item.tradeId}/evidence`, 1000);
  const { run, busy } = useAction();
  const [note, setNote] = useState('');
  const decide = (decision: string) => run(() => api(`ops/queue/${item.id}/decision`, { body: { decision, note } }));
  const trade = item.trade;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3">
        <section className="panel p-4">
          <h2 className="mb-2">Evidence</h2>
          <KeyValues rows={[['Trade', <span key="t" className="font-mono text-label">{trade.id}</span>], ['Exporter', trade.smeName], ['Buyer', trade.buyerName], ['Value', <TradeValue key="v" value={trade.value} fx={trade.fx} />], ['Status', <TradeStatusChip key="s" status={trade.status} />]]} />
        </section>
        <VerificationList bundle={bundle} />
      </div>
      <section className="panel flex flex-col gap-3 p-4">
        <h2>Decision</h2>
        {item.decision ? (
          <Callout tone={item.status === 'waiting' ? 'warn' : 'pass'} title={DECISIONS.find(([d]) => d === item.decision.decision)?.[1]}>
            {item.decision.note}. Recorded by {item.decision.by}, {formatDateTime(item.decision.at)}.
          </Callout>
        ) : null}
        {item.status !== 'closed' && (
          <>
            <label className="block">
              <span className="field-label mb-1 block">Note (required)</span>
              <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="flex flex-col gap-2">
              {DECISIONS.map(([decision, label, variant]) => (
                <Button key={decision} variant={variant} disabled={!note.trim() || busy} onClick={() => decide(decision)}>{label}</Button>
              ))}
            </div>
            <p className="text-table text-ink-2">This is a human decision and is recorded in the audit log.</p>
          </>
        )}
      </section>
    </div>
  );
}

function Queue() {
  const { data } = useApi<any>('ops/queue');
  const [openId, setOpenId] = useState<string>();
  if (!data) return <Rows />;
  if (data.cases.length === 0) return <div className="panel px-4 py-8">Nothing to review.</div>;
  const open = data.cases.find((c: any) => c.id === openId);
  return (
    <div className="flex flex-col gap-4">
      <div className="panel overflow-x-auto">
        <table className="ledger w-full border-collapse">
          <thead><tr>{['Reason', 'Trade', 'Age', 'Reviewer', 'Status'].map((h) => <th key={h} scope="col" className="field-label">{h}</th>)}</tr></thead>
          <tbody>
            {data.cases.map((c: any) => (
              <tr key={c.id} className={cn(c.id === openId && 'bg-paper')}>
                <th scope="row" className="font-medium"><button type="button" aria-expanded={c.id === openId} onClick={() => setOpenId(c.id === openId ? undefined : c.id)} className="min-h-7 text-left underline underline-offset-4 max-md:min-h-11">{c.reason}</button></th>
                <td className="whitespace-nowrap font-mono text-label">{c.tradeId}</td>
                <td className="tabular whitespace-nowrap">{age(c.openedAt)}</td>
                <td className="whitespace-nowrap">{c.reviewer}</td>
                <td><StatusChip kind={c.status === 'closed' ? 'pass' : c.status === 'waiting' ? 'warn' : 'pending'}>{c.status === 'closed' ? 'Decided' : c.status === 'waiting' ? 'Waiting on exporter' : 'Open'}</StatusChip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <CaseDetail key={open.id} item={open} />}
    </div>
  );
}

function AuditLog() {
  const [tradeId, setTradeId] = useState('');
  const { data: trades } = useApi<any>('trades', 2000);
  const { data } = useApi<any>(`audit${tradeId ? `?tradeId=${encodeURIComponent(tradeId)}` : ''}`);
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data.events, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashew-audit${tradeId ? `-${tradeId}` : ''}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className="field-label mb-1 block">Filter by trade</span>
          <select className="input w-auto" value={tradeId} onChange={(e) => setTradeId(e.target.value)}>
            <option value="">All events</option>
            {(trades?.trades ?? []).filter((t: any) => !t.history).map((t: any) => <option key={t.id}>{t.id}</option>)}
          </select>
        </label>
        <Button disabled={!data} onClick={exportJson}>Export as JSON</Button>
      </div>
      {!data ? <Rows /> : (
        <div className="panel overflow-x-auto">
          <table className="ledger w-full border-collapse">
            <thead><tr>{['When', 'Actor', 'Action', 'Object'].map((h) => <th key={h} scope="col" className="field-label">{h}</th>)}</tr></thead>
            <tbody>
              {data.events.map((e: any) => (
                <tr key={e.id}>
                  <td className="tabular whitespace-nowrap text-ink-2">{formatDateTime(e.timestamp)}</td>
                  <td>{e.actor}</td>
                  <td className="font-mono text-label">{e.action}</td>
                  <td className="whitespace-nowrap font-mono text-label">{e.object}</td>
                </tr>
              ))}
              {data.events.length === 0 && <tr><td colSpan={4}>No events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Matching() {
  const { data } = useApi<any>('ops/matching');
  if (!data) return <Rows />;
  if (data.trades.length === 0) return <div className="panel px-4 py-8">No offer requests yet.</div>;
  return (
    <div className="flex flex-col gap-4">
      {data.trades.map((t: any) => (
        <section key={t.id} className="panel p-4">
          <h2 className="mb-2 font-mono text-label">{t.id}</h2>
          <ul className="flex flex-col gap-2">
            {t.eligibility.map((d: any) => (
              <li key={d.lenderId}>
                <span className="flex flex-wrap items-center gap-2"><span className="font-medium">{d.lenderName}</span><StatusChip kind={d.eligible ? 'pass' : 'warn'}>{d.eligible ? 'Received the request' : 'Did not receive it'}</StatusChip></span>
                {d.reasons.length > 0 && <ul className="mt-1 list-disc pl-5 text-table text-ink-2">{d.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Events() {
  const { data } = useApi<any>('ops/events');
  if (!data) return <Rows />;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-table text-ink-2">In-process webhook events. In the real product these would go to lender systems.</p>
      <div className="panel overflow-x-auto">
        <table className="ledger w-full border-collapse">
          <thead><tr>{['When', 'Event', 'Object'].map((h) => <th key={h} scope="col" className="field-label">{h}</th>)}</tr></thead>
          <tbody>
            {data.events.map((e: any) => <tr key={e.id}><td className="tabular whitespace-nowrap text-ink-2">{formatDateTime(e.at)}</td><td className="font-mono text-label">{e.type}</td><td className="font-mono text-label">{e.object}</td></tr>)}
            {data.events.length === 0 && <tr><td colSpan={3}>No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Ops() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('queue');
  return (
    <>
      <PageHead title="Ops" intro="Human review of flagged cases, and the log of every state change." />
      <nav aria-label="Ops sections" className="mb-4 flex overflow-x-auto border-b border-ink">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)} className={cn('min-h-11 flex-none whitespace-nowrap px-3 transition-colors duration-fast hover:bg-sheet', tab === key ? 'font-semibold shadow-[inset_0_-3px_0_var(--ink)]' : 'text-ink-2')}>{label}</button>
        ))}
      </nav>
      {tab === 'queue' && <Queue />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'matching' && <Matching />}
      {tab === 'events' && <Events />}
      {tab === 'health' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map((name) => (
            <section key={name} className="panel p-4">
              <h2>{name}</h2>
              <div className="mt-2"><StatusChip kind="pass">Simulated, healthy</StatusChip></div>
              <p className="mt-2 text-table text-ink-2">Manual fallback available</p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
