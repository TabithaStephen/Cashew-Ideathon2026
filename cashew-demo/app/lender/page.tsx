'use client';

import Link from 'next/link';
import { useState } from 'react';
import { StatusChip } from '@/components/StatusChip';
import { PageHead, Rows, TradeValue } from '@/components/app/parts';
import { useApi } from '@/lib/client/api';
import { formatDateTime } from '@/lib/ui';
import { cn } from '@/lib/utils';

const TABS = ['New', 'Offered', 'Financed'] as const;
const BAND = { Strong: 'pass', Moderate: 'warn', Limited: 'fail' } as const;
const OFFER_KIND = { 'Not responded': 'pending', 'Offer sent': 'info', Declined: 'unknown', Accepted: 'pass' } as const;

export default function LenderInbox() {
  const { data } = useApi<any>('trades');
  const { data: me } = useApi<any>('orgs/me', 2000);
  const [tab, setTab] = useState<(typeof TABS)[number]>('New');
  const rows = (data?.trades ?? []).filter((t: any) => t.tab === tab);
  return (
    <>
      <PageHead title="Inbox" intro={`Trades shared with ${me?.displayName ?? 'you'}. A trade shows here only while the exporter’s consent is active.`} />
      <nav aria-label="Inbox sections" className="mb-4 flex border-b border-ink">
        {TABS.map((key) => (
          <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)} className={cn('min-h-11 px-3 transition-colors duration-fast hover:bg-sheet', tab === key ? 'font-semibold shadow-[inset_0_-3px_0_var(--ink)]' : 'text-ink-2')}>
            {key} ({(data?.trades ?? []).filter((t: any) => t.tab === key).length})
          </button>
        ))}
      </nav>
      {!data ? <Rows /> : rows.length === 0 ? (
        <div className="panel px-4 py-8">{tab === 'New' ? 'No new trades. Exporters choose when to share one with you.' : `Nothing here yet.`}</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="ledger w-full border-collapse">
            <thead>
              <tr>{['Trade ID', 'Exporter', 'Buyer', 'Value', 'Corridor', 'Evidence strength', 'Requested', 'Offer'].map((h) => <th key={h} scope="col" className="field-label">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((t: any) => (
                <tr key={t.id} className="transition-colors duration-fast hover:bg-paper">
                  <th scope="row" className="font-normal"><Link href={`/lender/trades/${t.id}`} className="flex min-h-7 items-center whitespace-nowrap font-mono text-label underline underline-offset-4 max-md:min-h-11">{t.id}</Link></th>
                  <td>{t.smeName}</td>
                  <td>{t.buyerName}</td>
                  <td><TradeValue value={t.value} fx={t.fx} /></td>
                  <td className="font-mono text-label">{t.corridor}</td>
                  <td>{t.band && <StatusChip kind={BAND[t.band as keyof typeof BAND]}>{t.band}</StatusChip>}</td>
                  <td className="tabular whitespace-nowrap text-ink-2">{formatDateTime(t.requestedAt)}</td>
                  <td><StatusChip kind={OFFER_KIND[t.offerStatus as keyof typeof OFFER_KIND]}>{t.offerStatus}</StatusChip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
