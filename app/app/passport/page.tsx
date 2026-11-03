'use client';
import { BadgeCheck, ChevronDown, Download, Link2, ShieldCheck, ShieldX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader, Skeleton } from '@/components/Card';
import { Label, Select } from '@/components/Field';
import { HashPill } from '@/components/HashPill';
import { StatusChip } from '@/components/StatusChip';
import { api, useApi } from '@/lib/client';
import { cn } from '@/lib/cn';
import { fmtDate, fmtDateTime, inr } from '@/lib/format';
import type { PassportCredential } from '@/lib/engines/passport';
import { verifyCredentialInBrowser, type VerifyOutcome } from '@/lib/passport-verify';
import { useMe } from '@/lib/session';
import type { ConsentArtefact } from '@/lib/types';

interface Res { credential: PassportCredential; shares: ConsentArtefact[]; history: { id: string; invoiceNo: string; value: number; repaidAt?: string; buyer?: string }[] }

export default function Passport() {
  const me = useMe();
  const orgId = me.data?.session?.orgId;
  const { data } = useApi<Res>(orgId ? `/api/passport/${orgId}` : null, 4000);
  const [showJson, setShowJson] = useState(false);
  const [tamper, setTamper] = useState(false);
  const [result, setResult] = useState<VerifyOutcome | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [recipient, setRecipient] = useState('lender_meridian');
  const [link, setLink] = useState<string | null>(null);

  // Tamper edits one claim in memory only (never in the store).
  const shown = useMemo(() => {
    if (!data) return null;
    const c = JSON.parse(JSON.stringify(data.credential)) as PassportCredential;
    if (tamper) c.claims.completedTrades = c.claims.completedTrades + 5;
    return c;
  }, [data, tamper]);
  const sig = data?.credential.proof.signature;
  useEffect(() => { setResult(null); }, [sig]);

  const verify = async (cred = shown) => {
    if (!cred) return;
    setVerifying(true);
    try { setResult(await verifyCredentialInBrowser(cred as unknown as Parameters<typeof verifyCredentialInBrowser>[0])); } finally { setVerifying(false); }
  };
  const toggleTamper = async () => {
    const next = !tamper; setTamper(next);
    if (!data) return;
    const c = JSON.parse(JSON.stringify(data.credential)) as PassportCredential;
    if (next) c.claims.completedTrades += 5;
    await verify(c);
  };
  const share = async () => {
    const r = await api<{ link: string }>('/api/passport/share', { json: { recipientOrgId: recipient, purpose: 'Credit assessment', days: 30 } });
    setLink(r.link);
  };
  const download = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.credential, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${data.credential.id.replace(/:/g, '_')}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  if (!data || !shown) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-96" /></div>;
  const cl = data.credential.claims;
  const onTime = cl.completedTrades ? Math.round((cl.repaidOnTime / cl.completedTrades) * 100) : 0;
  return (
    <div className="space-y-6">
      <div><h1>Trade Passport</h1><p className="text-ink-2">Your verified trade history as a signed credential any lender can check, without calling us.</p></div>
      <Card className="bg-brand text-white border-brand">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-accent flex flex-col items-center justify-center">
            <span className="text-caption text-white/70">Tier</span><span className="font-display text-[32px] leading-none">{cl.tier}</span>
          </div>
          <div className="flex-1 min-w-[200px]"><p className="font-display text-h2 text-white">{data.credential.subject.legalName}</p>
            <p className="text-white/70 text-sm">{cl.tier >= 3 ? 'Tier 3: four or more trades repaid on time.' : `Tier ${cl.tier}. Repay one more trade on time to reach Tier 3.`}</p></div>
          {[['Verified trades', String(cl.completedTrades)], ['On-time repayment', `${onTime}%`], ['Total financed', inr(cl.totalFinancedInr)]].map(([k, v]) => (
            <div key={k} className="text-right"><p className="text-caption text-white/70">{k}</p><p className="font-display text-h2 text-white tabular">{v}</p></div>
          ))}
        </div>
      </Card>
      <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Credential" subtitle={data.credential.id} right={<BadgeCheck className="text-brand" size={22} />} />
            <dl className="grid sm:grid-cols-3 gap-4 text-table">
              <div><dt className="text-caption text-ink-3">Issuer</dt><dd className="font-medium">{data.credential.issuer}</dd></div>
              <div><dt className="text-caption text-ink-3">Issued</dt><dd className="font-medium">{fmtDateTime(data.credential.issuedAt)}</dd></div>
              <div><dt className="text-caption text-ink-3">Expires</dt><dd className="font-medium">{fmtDate(data.credential.expiresAt)}</dd></div>
              <div className="sm:col-span-3"><dt className="text-caption text-ink-3">Entity checks</dt><dd className="flex gap-1.5 mt-1 flex-wrap">{Object.entries(cl.entityChecks).map(([k, v]) => <StatusChip key={k} variant={v === 'pass' ? 'pass' : 'unknown'} label={`${k.toUpperCase()} ${v}`} />)}</dd></div>
            </dl>
            <button onClick={() => setShowJson(!showJson)} className="mt-4 text-sm font-medium text-brand flex items-center gap-1" aria-expanded={showJson}><ChevronDown size={16} className={cn('transition-transform', showJson && 'rotate-180')} />{showJson ? 'Hide' : 'Show'} signed JSON</button>
            {showJson && <pre className="mt-2 font-mono text-[11px] leading-4 bg-canvas border border-line rounded-btn p-3 overflow-auto max-h-[420px]">{JSON.stringify(shown, null, 2)}</pre>}
            <div className="flex flex-wrap gap-2 mt-4"><Button variant="secondary" icon={<Download size={16} />} onClick={download}>Download credential (.json)</Button></div>
          </Card>
          <Card>
            <CardHeader title="Share with a lender" subtitle="Creates a consent artefact with a recipient, purpose and 30-day expiry" />
            <div className="flex items-end gap-2 flex-wrap">
              <div><Label htmlFor="rcp">Recipient</Label><Select id="rcp" className="w-56" value={recipient} onChange={(e) => setRecipient(e.target.value)}><option value="lender_banyan">Banyan Capital</option><option value="lender_tidewater">Tidewater Finance</option><option value="lender_meridian">Meridian Bank</option></Select></div>
              <Button icon={<Link2 size={16} />} onClick={share}>Generate share link</Button>
            </div>
            {link && <div className="mt-3 flex items-center gap-2"><span className="text-caption text-ink-3">Link</span><HashPill value={link} full label="Share link" /></div>}
            {data.shares.length > 0 && <ul className="mt-4 text-table space-y-1">{data.shares.map((s) => <li key={s.id} className="flex justify-between"><span>{s.recipientLabel} · {s.purpose}</span><span className="text-ink-3">{s.revokedAt ? 'revoked' : `until ${fmtDate(s.expiresAt)}`}</span></li>)}</ul>}
          </Card>
          {data.history.length > 0 && (
            <Card><CardHeader title="Certified history" />
              <table className="w-full text-table"><tbody>{data.history.map((h) => <tr key={h.id} className="border-t border-line"><td className="py-2 font-mono text-[12px]">{h.invoiceNo}</td><td className="py-2">{h.buyer}</td><td className="py-2 tabular">USD {h.value.toLocaleString('en-US')}</td><td className="py-2 text-right"><StatusChip variant="pass" label={`Repaid ${h.repaidAt ? fmtDate(h.repaidAt) : ''}`} /></td></tr>)}</tbody></table>
            </Card>
          )}
        </div>
        <Card className="lg:sticky lg:top-[112px]">
          <CardHeader title="Verify" subtitle="Ed25519 signature check, run locally in this browser. No network." />
          <Button className="w-full" icon={<ShieldCheck size={16} />} loading={verifying} onClick={() => verify()}>Verify in your browser</Button>
          {result && (
            <div className={cn('mt-4 rounded-card p-4 border', result.valid ? 'bg-success-soft border-success/30' : 'bg-danger-soft border-danger/30')} role="status">
              <p className={cn('text-h3 font-display flex items-center gap-2', result.valid ? 'text-success' : 'text-danger')}>{result.valid ? <ShieldCheck /> : <ShieldX />}{result.valid ? 'Signature valid' : 'Signature invalid'}</p>
              <p className="text-sm mt-1">{result.valid ? 'Contents are exactly what Cashew signed.' : 'Signature invalid. Contents were changed.'}</p>
              <p className="text-caption text-ink-3 mt-2">Verified with {result.method}</p>
            </div>
          )}
          <div className="mt-5 pt-5 border-t border-line">
            <button role="switch" aria-checked={tamper} onClick={toggleTamper} className="w-full flex items-center justify-between">
              <span className="text-left"><span className="text-sm font-semibold block">Tamper toggle</span><span className="text-caption text-ink-3">Edits one claim in memory: completed trades {cl.completedTrades} → {cl.completedTrades + 5}</span></span>
              <span className={cn('w-10 h-6 rounded-full relative transition-colors shrink-0', tamper ? 'bg-danger' : 'bg-line')}><span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all', tamper ? 'left-[18px]' : 'left-0.5')} /></span>
            </button>
          </div>
          <div className="mt-4 text-caption text-ink-3 space-y-1"><p>Public key</p><HashPill value={data.credential.proof.publicKey} label="Issuer public key" /></div>
        </Card>
      </div>
    </div>
  );
}
