'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { HashPill } from '@/components/HashPill';
import { Modal } from '@/components/Modal';
import { StatCard } from '@/components/StatCard';
import { StatusChip } from '@/components/StatusChip';
import { Callout, PageHead, Rows } from '@/components/app/parts';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatDateTime } from '@/lib/ui';

const STATUS_KIND = { FINANCED: 'info', SETTLED: 'pass', RELEASED: 'unknown' } as const;
const CODE_TEXT: Record<string, { tone: 'pass' | 'fail' | 'warn'; title: string; body?: string }> = {
  NONE: { tone: 'pass', title: 'No match in the registry.' },
  FINANCED_BY_OTHER: { tone: 'fail', title: 'Blocked: already financed.', body: 'This invoice has already been financed through Cashew. Details of the other lender are not shared.' },
  POSSIBLE_DUPLICATE: { tone: 'warn', title: 'Possible duplicate. Send it for review.' },
  RELEASED: { tone: 'pass', title: 'Matched an invoice that has been settled, so it is free.' },
};

function CheckTool({ scenario, inbox }: { scenario: string; inbox: any[] }) {
  const { run, busy } = useAction();
  const [result, setResult] = useState<any>();
  const [label, setLabel] = useState('');
  const check = async (body: object, name: string) => {
    const found = await run(() => api('registry/check', { body }));
    if (found) {
      setResult(found);
      setLabel(name);
    }
  };
  const text = result && CODE_TEXT[result.code];
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <h2>Check an invoice</h2>
      <p className="text-table text-ink-2">The registry answers with a result only. It never says who financed an invoice.</p>
      <div className="flex flex-wrap gap-2">
        {inbox.map((t) => <Button key={t.id} size="compact" disabled={busy} onClick={() => check({ tradeId: t.id }, t.invoiceNo ?? t.id)}>{t.invoiceNo ?? t.id}</Button>)}
        {scenario === 'C' && (
          <>
            <Button size="compact" disabled={busy} onClick={() => check({ sample: 'exact' }, 'CKS/2627/0188')}>Sample: exact copy</Button>
            <Button size="compact" disabled={busy} onClick={() => check({ sample: 'altered' }, 'CKS/2627/0188-A')}>Sample: altered copy</Button>
          </>
        )}
        {inbox.length === 0 && scenario !== 'C' && <p className="text-table text-ink-2">Trades shared with you appear here.</p>}
      </div>
      {text && (
        <div role="status">
          <Callout tone={text.tone === 'warn' ? 'warn' : text.tone} title={`${label}: ${text.title}`}>
            {text.body}
            {result.similarity && <span className="tabular">Overall similarity {result.similarity.overall.toFixed(2)}.</span>}
          </Callout>
        </div>
      )}
    </section>
  );
}

export default function Registry() {
  const { data: me } = useApi<any>('orgs/me', 2000);
  const { data, error } = useApi<any>('registry/entries');
  const { data: inbox } = useApi<any>(me?.role === 'lender' ? 'trades' : null, 2000);
  const { run, busy } = useAction();
  const [chain, setChain] = useState<any>();
  const [anchored, setAnchored] = useState<any>();

  if (error?.status === 403) return <div role="alert" className="panel p-6">The registry is visible to lenders and Ops.</div>;
  if (!data) return <Rows count={6} />;
  const verify = async () => {
    const result = await run(() => api('registry/verify-chain', { method: 'POST' }));
    if (result) setChain(result);
  };
  const anchor = async () => {
    const result = await run(() => api('registry/anchor', { method: 'POST' }));
    if (result) setAnchored(result);
  };

  return (
    <>
      <PageHead
        title="Registry"
        intro="An append-only log of invoices financed through Cashew. It holds hashes, status and timestamps, and lenders are masked."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={busy} onClick={verify}>Verify chain</Button>
            <Button onClick={anchor}>Anchor now</Button>
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Entries" value={data.chainLength} />
          <StatCard label="Chain length" value={data.chainLength} />
          <div className="panel min-w-0 p-4">
            <p className="field-label">Latest chain hash</p>
            <div className="mt-2">{data.head ? <HashPill hash={data.head} label="chain head" /> : '—'}</div>
          </div>
          <StatCard label="Last anchored" value={data.lastAnchoredAt ? formatDateTime(data.lastAnchoredAt) : 'Not yet'} delta={data.lastAnchoredAt ? 'Simulated' : undefined} />
        </div>
        {chain && (
          <div role="status">
            {chain.intact ? <Callout tone="pass" title={`Chain intact, ${chain.entries} entries verified.`} /> : <Callout tone="fail" title={`Chain broken at entry ${chain.brokenAt}.`}>{chain.reason}</Callout>}
          </div>
        )}
        {me?.role === 'lender' && <CheckTool scenario={me.scenario} inbox={(inbox?.trades ?? []).filter((t: any) => t.docs.length > 0)} />}
        <div className="panel overflow-x-auto">
          <table className="ledger w-full border-collapse">
            <thead><tr>{['#', 'Fingerprint', 'Status', 'Lender', 'Time', 'Entry hash', 'Previous hash'].map((h) => <th key={h} scope="col" className="field-label">{h}</th>)}</tr></thead>
            <tbody>
              {data.entries.map((e: any) => (
                <tr key={e.position}>
                  <td className="tabular">{e.position}</td>
                  <td><HashPill hash={e.fingerprint} label="fingerprint" /></td>
                  <td><StatusChip kind={STATUS_KIND[e.status as keyof typeof STATUS_KIND]}>{e.status}</StatusChip></td>
                  <td className="whitespace-nowrap">{e.lender}</td>
                  <td className="tabular whitespace-nowrap text-ink-2">{formatDateTime(e.timestamp)}</td>
                  <td><HashPill hash={e.entryHash} label="entry hash" /></td>
                  <td><HashPill hash={e.prevHash} label="previous hash" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-table text-ink-2"><span className="font-semibold">Why not a blockchain?</span> A signed append-only log is enough until three or more independent lenders want to hold a node.</p>
      </div>
      <Modal open={Boolean(anchored)} onClose={() => setAnchored(undefined)} title="Anchor now (simulated)" footer={<Button variant="primary" onClick={() => setAnchored(undefined)}>Done</Button>}>
        {anchored && <p>Chain head <span className="font-mono text-label">{anchored.head ? `${anchored.head.slice(0, 8)}…${anchored.head.slice(-4)}` : 'empty'}</span> published to an external anchor (simulated). Nothing left this computer.</p>}
      </Modal>
    </>
  );
}
