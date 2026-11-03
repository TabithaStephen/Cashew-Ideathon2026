'use client';
import { Anchor, CheckCircle2, Info, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { HashPill } from '@/components/HashPill';
import { Modal } from '@/components/Overlay';
import { StatCard } from '@/components/StatCard';
import { StatusChip } from '@/components/StatusChip';
import { api, useApi } from '@/lib/client';
import { ago, fmtDateTime, truncHash } from '@/lib/format';

interface Entry { position: number; fingerprint: string; status: string; currentStatus: string; lender: string; timestamp: string; entryHash: string; prevHash: string; refPosition?: number; hasIrn: boolean }
interface Res { entries: Entry[]; count: number; head: string | null; lastAnchoredAt?: string; anchoredHead: string | null; chainOk: boolean }

export default function Registry() {
  const { data } = useApi<Res>('/api/registry/entries', 2000);
  const [verify, setVerify] = useState<{ ok: boolean; count: number; brokenAt?: number; reason?: string; ms: number } | null>(null);
  const [anchor, setAnchor] = useState<{ head: string; anchoredAt: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const runVerify = async () => { setBusy('v'); try { setVerify(await api('/api/registry/verify-chain', { json: {} })); } finally { setBusy(null); } };
  const runAnchor = async () => { setBusy('a'); try { setAnchor(await api('/api/registry/anchor', { json: {} })); } finally { setBusy(null); } };
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1>Duplicate-financing registry</h1><p className="text-ink-2">A signed, append-only log of invoice fingerprints. Lender identities are masked.</p></div>
        <div className="flex gap-2"><Button variant="secondary" icon={<Anchor size={16} />} loading={busy === 'a'} onClick={runAnchor}>Anchor now</Button><Button icon={<ShieldCheck size={16} />} loading={busy === 'v'} onClick={runVerify}>Verify chain</Button></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Entries" numeric={data?.count ?? 0} format={(n) => String(Math.round(n))} />
        <StatCard label="Chain length" value={data ? `${data.count} links` : '–'} delta="Genesis → head" />
        <StatCard label="Latest chain hash" value={data?.head ? <HashPill value={data.head} label="Chain head" /> : '–'} />
        <StatCard label="Last anchored" value={data?.lastAnchoredAt ? ago(data.lastAnchoredAt) : '–'} delta="External anchor (simulated)" />
      </div>
      {verify && (
        <div className={`rounded-card border p-4 flex items-center gap-3 ${verify.ok ? 'border-success/30 bg-success-soft' : 'border-danger/30 bg-danger-soft'}`} role="status">
          {verify.ok ? <CheckCircle2 className="text-success" /> : <XCircle className="text-danger" />}
          <p className="text-sm font-semibold">{verify.ok ? `Chain intact, ${verify.count} entries verified.` : `Chain broken at entry #${verify.brokenAt}: ${verify.reason}.`}</p>
          <span className="text-caption text-ink-3 ml-auto">Every hash link and Ed25519 signature recomputed in {verify.ms} ms</span>
        </div>
      )}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-6"><CardHeader title="Entries" subtitle="Newest first. Status changes append new entries that reference the original; nothing is edited." /></div>
        <div className="overflow-x-auto"><table className="w-full text-table">
          <thead><tr className="text-left text-caption text-ink-3 border-y border-line">{['#', 'Fingerprint', 'Status', 'Lender', 'Timestamp', 'Entry hash', 'Previous hash'].map((h) => <th key={h} className="font-medium py-2.5 px-4">{h}</th>)}</tr></thead>
          <tbody>{data?.entries.map((e) => (
            <tr key={e.position} className="border-b border-line last:border-0">
              <td className="py-2.5 px-4 tabular font-medium">{e.position}</td>
              <td className="py-2.5 px-4"><HashPill value={e.fingerprint} label="Fingerprint" /></td>
              <td className="py-2.5 px-4"><StatusChip variant={e.status === 'FINANCED' ? (e.currentStatus === 'FINANCED' ? 'info' : 'neutral') : 'pass'} label={e.status} />{e.refPosition && <span className="text-caption text-ink-3 ml-1.5">→ #{e.refPosition}</span>}</td>
              <td className="py-2.5 px-4">{e.lender}</td>
              <td className="py-2.5 px-4 text-ink-2 whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
              <td className="py-2.5 px-4 font-mono text-mono text-ink-2">{truncHash(e.entryHash)}</td>
              <td className="py-2.5 px-4 font-mono text-mono text-ink-3">{truncHash(e.prevHash)}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>
      <p className="text-caption text-ink-3 flex items-center gap-1.5"><Info size={14} />Why not a blockchain? A signed append-only log is enough until three or more independent lenders want to hold a node.</p>
      <Modal open={!!anchor} onClose={() => setAnchor(null)} title="Anchored (simulated)" footer={<Button onClick={() => setAnchor(null)}>Done</Button>}>
        {anchor && <div className="space-y-3"><p className="text-sm">Chain head <span className="font-mono bg-canvas border border-line rounded px-1.5">{truncHash(anchor.head)}</span> published to an external anchor (simulated).</p>
          <p className="text-caption text-ink-3">{fmtDateTime(anchor.anchoredAt)}. In production this would be a public timestamping service; in the demo nothing leaves this machine.</p></div>}
      </Modal>
    </div>
  );
}
