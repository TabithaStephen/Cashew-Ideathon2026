'use client';
import { ArrowRight, Ban, CheckCircle2, Landmark, PackageCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader, Skeleton } from '@/components/Card';
import { DocSlot } from '@/components/DocSlot';
import { EmptyState } from '@/components/EmptyState';
import { HashPill } from '@/components/HashPill';
import { StatusChip, TradeStatusChip } from '@/components/StatusChip';
import { Tabs } from '@/components/Tabs';
import { Timeline } from '@/components/Timeline';
import { DocDetailDrawer, reviewCount } from '@/components/trade/DocDetailDrawer';
import { EvidenceStrength } from '@/components/trade/EvidenceStrength';
import { OffersComparison } from '@/components/trade/OffersComparison';
import { VerificationPanel } from '@/components/trade/VerificationPanel';
import { api, useApi } from '@/lib/client';
import type { Workspace } from '@/lib/client-types';
import { exportValue, fmtDate, fmtDateTime, inr } from '@/lib/format';
import { DOC_LABELS, DOC_TYPES, SHIPMENT_STAGES, type AuditEvent, type DocType } from '@/lib/types';

const TL = ['Submitted', 'Verified', 'Offers', 'Financed', 'Shipped', 'Delivered', 'Repaid'] as const;
type Tab = 'overview' | 'documents' | 'verification' | 'offers' | 'financing' | 'tracking' | 'activity';

export default function TradeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const router = useRouter();
  const tab = (q.get('tab') as Tab) ?? 'overview';
  const setTab = (t: Tab) => router.replace(`/app/trades/${id}?tab=${t}`, { scroll: false });
  const { data: ws, error } = useApi<Workspace>(`/api/trades/${id}`, 1000);
  if (error) return <Card><EmptyState text={error.status === 404 ? 'This trade no longer exists (the demo may have been reset).' : error.message} action={<Link href="/app"><Button>Back to dashboard</Button></Link>} /></Card>;
  if (!ws) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;
  const t = ws.trade;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><HashPill value={t.id} full label="Trade ID" /><TradeStatusChip status={t.status} />{t.registryBlock && <StatusChip variant="fail" label="Blocked by registry" />}</div>
            <h2 className="mt-2">{ws.buyer.name}</h2>
            <p className="text-sm text-ink-2 tabular">{exportValue(t.value, t.fx)} · {t.invoiceNo} · {t.incoterm}, {t.paymentTermsDays} days</p>
          </div>
          {ws.nextAction && (
            <div className="bg-brand-soft rounded-btn px-4 py-3 max-w-xs">
              <p className="text-caption text-brand">Next step</p>
              <p className="text-sm font-semibold">{ws.nextAction.title}</p>
              {ws.nextAction.href ? <Link href={ws.nextAction.href} className="text-caption text-brand font-medium hover:underline">Go <ArrowRight size={12} className="inline" /></Link>
                : ws.nextAction.tab && ws.nextAction.tab !== tab && <button onClick={() => setTab(ws.nextAction!.tab as Tab)} className="text-caption text-brand font-medium hover:underline">Open {ws.nextAction.tab} <ArrowRight size={12} className="inline" /></button>}
            </div>
          )}
        </div>
        <div className="mt-6"><Timeline steps={TL} current={t.timelineIndex - 1 < 0 ? 0 : Math.min(t.timelineIndex, TL.length)} /></div>
      </Card>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' }, { id: 'documents', label: 'Documents' }, { id: 'verification', label: 'Verification' },
        { id: 'offers', label: 'Offers' }, { id: 'financing', label: 'Financing' }, { id: 'tracking', label: 'Tracking' }, { id: 'activity', label: 'Activity' },
      ]} />

      {tab === 'overview' && <Overview ws={ws} go={setTab} />}
      {tab === 'documents' && <Documents ws={ws} />}
      {tab === 'verification' && <VerificationPanel tradeId={t.id} />}
      {tab === 'offers' && <OffersComparison tradeId={t.id} />}
      {tab === 'financing' && <Financing ws={ws} />}
      {tab === 'tracking' && <Tracking ws={ws} />}
      {tab === 'activity' && <Activity ws={ws} />}
    </div>
  );
}

function Overview({ ws, go }: { ws: Workspace; go: (t: Tab) => void }) {
  const t = ws.trade;
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <Card>
        <CardHeader title="Summary" />
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-table">
          {[['Exporter', ws.org.legalName], ['Buyer', `${ws.buyer.name}, ${ws.buyer.city}`], ['Goods', t.goods], ['HS code', t.hsCode], ['Invoice', t.invoiceNo],
            ['Value', exportValue(t.value, t.fx)], ['Corridor', t.corridor], ['Shipment', t.shipmentStageName], ['Created', fmtDate(t.createdAt)], ['Buyer confirmation', t.buyerConfirmed ? 'Confirmed' : 'Awaiting buyer']].map(([k, v]) => (
            <div key={k}><dt className="text-caption text-ink-3">{k}</dt><dd className="font-medium tabular">{v}</dd></div>
          ))}
        </dl>
        {ws.nextAction && (
          <div className="mt-6 rounded-btn border border-line p-4 flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold">{ws.nextAction.title}</p><p className="text-table text-ink-2">{ws.nextAction.body}</p></div>
            {ws.nextAction.href ? <Link href={ws.nextAction.href}><Button compact>Continue</Button></Link> : ws.nextAction.tab ? <Button compact onClick={() => go(ws.nextAction!.tab as Tab)}>Continue</Button> : null}
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Evidence strength" subtitle="What lenders see, before their own weighting" />
        {ws.risk ? <EvidenceStrength risk={ws.risk} /> : <p className="text-sm text-ink-3">Run verification to build the evidence bundle.</p>}
      </Card>
    </div>
  );
}

function Documents({ ws }: { ws: Workspace }) {
  const [open, setOpen] = useState<DocType | null>(null);
  return (
    <Card>
      <CardHeader title="Documents" subtitle={`${ws.versions.length} file version${ws.versions.length === 1 ? '' : 's'} on record`} />
      <div className="grid sm:grid-cols-2 gap-4">
        {DOC_TYPES.map((t) => {
          const d = ws.docs[t]; const rc = reviewCount(d);
          return <DocSlot key={t} label={DOC_LABELS[t]} state={d ? (rc ? 'review' : 'extracted') : 'empty'} fieldCount={d ? Object.keys(d.extracted.fields).length : 0} reviewCount={rc}
            fileName={d?.fileName} version={d?.version} amended={d?.amended} onOpen={() => setOpen(t)} disabled />;
        })}
      </div>
      <DocDetailDrawer doc={open ? ws.docs[open] ?? null : null} onClose={() => setOpen(null)} canReview />
    </Card>
  );
}

function Financing({ ws }: { ws: Workspace }) {
  const t = ws.trade;
  if (!ws.accepted) return <Card><EmptyState text="No offer accepted yet. Compare offers on the Offers tab." /></Card>;
  const { offer, lender } = ws.accepted;
  const maths = ws.accepted.maths!;
  const signed = !['OFFERS_OPEN', 'OFFER_ACCEPTED'].includes(t.status);
  const financed = !!t.disbursedAt;
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader title="Accepted offer" subtitle={lender} right={<Landmark size={20} className="text-ink-3" />} />
        <div className="grid grid-cols-2 gap-y-2 text-table">
          <span className="text-ink-3">Advance</span><span className="text-right tabular font-medium">{inr(maths.advance)} ({(offer.advancePct * 100).toFixed(0)}%)</span>
          <span className="text-ink-3">Effective annualised cost</span><span className="text-right tabular font-medium">{(maths.effectiveAPR * 100).toFixed(2)}%</span>
          <span className="text-ink-3">Net cash to you</span><span className="text-right tabular font-semibold">{inr(maths.netCash)}</span>
          <span className="text-ink-3">Tenure</span><span className="text-right">{offer.tenureDays} days</span>
          <span className="text-ink-3">Recourse</span><span className="text-right">{offer.recourseLabel}</span>
        </div>
        <div className="mt-5 space-y-2.5">
          <Step done={true} label="Offer accepted" />
          <Step done={signed} label={signed ? `E-signed with OTP${t.signedAt ? ` · ${fmtDateTime(t.signedAt)}` : ''}` : 'Awaiting e-sign'} note="Simulated e-sign" />
          <Step done={!!t.registryReceipt} fail={!!t.registryBlock} label={t.registryBlock ? 'Blocked by the duplicate-financing registry' : t.registryReceipt ? 'Recorded in the duplicate-financing registry' : 'Registry commit pending'} />
          <Step done={financed} label={financed ? `Disbursed ${fmtDateTime(t.disbursedAt!)}` : 'Disbursal pending'} note="Simulated money movement" />
        </div>
      </Card>
      <div className="space-y-6">
        {t.registryReceipt && (
          <Card className="border-brand/30">
            <CardHeader title="Registry receipt" subtitle="Recorded in the duplicate-financing registry" right={<ShieldCheck size={20} className="text-brand" />} />
            <div className="grid grid-cols-[120px_1fr] gap-y-2 items-center text-table">
              <span className="text-ink-3">Fingerprint</span><HashPill value={t.registryReceipt.fingerprint} label="Invoice fingerprint" />
              <span className="text-ink-3">Entry hash</span><HashPill value={t.registryReceipt.entryHash} label="Entry hash" />
              <span className="text-ink-3">Chain position</span><span className="tabular font-medium">#{t.registryReceipt.position}</span>
              <span className="text-ink-3">Recorded</span><span>{fmtDateTime(t.registryReceipt.timestamp)}</span>
            </div>
            <p className="text-caption text-ink-3 mt-3">Only hashes are stored. No documents or personal data.</p>
          </Card>
        )}
        {t.registryBlock && <Card className="border-danger/30 bg-danger-soft/40"><p className="text-sm font-semibold text-danger flex items-center gap-2"><Ban size={16} /> This invoice has already been financed through Cashew.</p><p className="text-table text-ink-2 mt-1">Details of the other lender are not shared.</p></Card>}
        {ws.repayment && (
          <Card>
            <CardHeader title="Repayment schedule" />
            <table className="w-full text-table"><tbody>
              <tr className="border-b border-line"><td className="py-2 text-ink-3">Principal</td><td className="py-2 text-right tabular">{inr(ws.repayment.principal)}</td></tr>
              <tr className="border-b border-line"><td className="py-2 text-ink-3">Interest ({offer.tenureDays} days)</td><td className="py-2 text-right tabular">{inr(ws.repayment.interest)}</td></tr>
              <tr><td className="py-2 font-semibold">Due {fmtDate(ws.repayment.dueAt)}, from buyer proceeds</td><td className="py-2 text-right tabular font-semibold">{inr(ws.repayment.amount)}</td></tr>
            </tbody></table>
            {t.repaidAt && <p className="mt-3"><StatusChip variant="pass" label={`Repaid on time · ${fmtDate(t.repaidAt)}`} /></p>}
          </Card>
        )}
      </div>
    </div>
  );
}
function Step({ done, fail, label, note }: { done: boolean; fail?: boolean; label: string; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {fail ? <Ban size={18} className="text-danger" /> : done ? <CheckCircle2 size={18} className="text-success" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-dashed border-line" />}
      <span className={fail ? 'text-danger font-medium' : done ? 'text-ink' : 'text-ink-3'}>{label}</span>
      {note && <span className="text-[11px] text-ink-3 bg-canvas border border-line rounded-full px-2">{note}</span>}
    </div>
  );
}

function Tracking({ ws }: { ws: Workspace }) {
  const t = ws.trade;
  const stage = t.shipmentStage ?? 0;
  const [busy, setBusy] = useState(false);
  const confirm = async () => { setBusy(true); try { await api(`/api/trades/${t.id}/milestone`, { json: { stage: 4 } }); } finally { setBusy(false); } };
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <Card>
        <CardHeader title="Shipment" subtitle={`${ws.docs.bl?.extracted.fields.vessel?.value ?? 'Vessel'} · INTUT → GBFXT`} right={<StatusChip variant="neutral" label="Carrier feed simulated" />} />
        <Timeline orientation="vertical" steps={SHIPMENT_STAGES} current={stage === 4 ? 5 : stage} notes={{ 0: 'Booking confirmed with the forwarder', 1: 'Container loaded at Tuticorin', 2: 'Vessel departed. Check 7 can now pass.', 3: 'Arrived Felixstowe', 4: 'Goods delivered to buyer' }} />
      </Card>
      <Card>
        <CardHeader title="Milestone confirmations" />
        <p className="text-table text-ink-2">Confirm delivery when your buyer receives the goods. Lenders see each confirmation.</p>
        <Button className="mt-4 w-full" icon={<PackageCheck size={16} />} disabled={stage >= 4 || !t.disbursedAt} loading={busy} onClick={confirm}>{stage >= 4 ? 'Goods delivered' : 'Confirm goods delivered'}</Button>
        {!t.disbursedAt && <p className="text-caption text-ink-3 mt-2">Available once the trade is financed.</p>}
      </Card>
    </div>
  );
}

function Activity({ ws }: { ws: Workspace }) {
  const { data } = useApi<AuditEvent[]>(`/api/audit?tradeId=${ws.trade.id}`, 2000);
  const revoke = async (id: string) => { await api(`/api/consents/${id}`, { method: 'DELETE' }); };
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-6"><CardHeader title="Activity" subtitle="Every state change is recorded. Newest first." /></div>
        <ul className="max-h-[640px] overflow-y-auto">
          {(data ?? []).map((e) => (
            <li key={e.id} className="px-6 py-2.5 border-t border-line flex gap-4 text-table">
              <span className="text-caption text-ink-3 tabular w-[130px] shrink-0">{fmtDateTime(e.timestamp).replace(' UTC', '')}</span>
              <span className="font-mono text-[12px] text-brand shrink-0 w-[210px] truncate">{e.action}</span>
              <span className="text-ink-2 truncate">{e.actor}{e.meta ? ` · ${summarise(e.meta)}` : ''}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Consent artefacts" />
        {ws.consents.length === 0 && <p className="text-table text-ink-3">No consent given yet.</p>}
        <ul className="space-y-3">
          {ws.consents.map((c) => (
            <li key={c.id} className="border border-line rounded-btn p-3 text-table">
              <div className="flex justify-between items-center"><span className="font-semibold">{c.recipient}</span>{c.active ? <StatusChip variant="pass" label="Active" /> : <StatusChip variant="neutral" label={c.revokedAt ? 'Revoked' : 'Expired'} />}</div>
              <p className="text-caption text-ink-3 mt-1">{c.purpose} · expires {fmtDate(c.expiresAt)}</p>
              <div className="flex justify-between items-center mt-2"><HashPill value={c.id} full label="Consent ID" />{c.active && <Button compact variant="ghost" onClick={() => revoke(c.id)}>Revoke</Button>}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
function summarise(meta: unknown) {
  const s = JSON.stringify(meta);
  return s.length > 90 ? s.slice(0, 89) + '…' : s;
}
