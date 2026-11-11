'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { StatCard } from '@/components/StatCard';
import { Callout, KeyValues, PageHead, Rows } from '@/components/app/parts';
import { api, useAction, useApi } from '@/lib/client/api';
import { verifyPassport, type TradePassport } from '@/lib/engines/passport-verify';
import { formatINR } from '@/lib/format';
import { formatDate } from '@/lib/ui';

export default function Passport() {
  const { data: me } = useApi<any>('orgs/me', 2000);
  const { data } = useApi<any>(me?.org ? `passport/${me.org.id}` : null);
  const { run, busy } = useAction();
  const [tamper, setTamper] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; method: string; tampered: boolean }>();
  const [recipient, setRecipient] = useState('lender_meridian');
  const [share, setShare] = useState<any>();
  const original: TradePassport | undefined = data?.passport;
  const signature = original?.proof.signature;

  // Edits a claim in memory only. The store is never touched.
  const shown = useMemo<TradePassport | undefined>(() => {
    if (!original) return undefined;
    if (!tamper) return original;
    return { ...original, claims: { ...original.claims, completedTrades: original.claims.completedTrades === 9 ? 10 : 9 } };
  }, [original, tamper]);

  // A new credential hasn't been verified yet.
  useEffect(() => setResult(undefined), [signature]);

  const verify = async (passport: TradePassport | undefined = shown, tampered = tamper) => {
    if (!passport) return;
    const outcome = await verifyPassport(passport);
    setResult({ ...outcome, tampered });
  };

  const toggleTamper = (on: boolean) => {
    setTamper(on);
    if (original) {
      const next = on ? { ...original, claims: { ...original.claims, completedTrades: original.claims.completedTrades === 9 ? 10 : 9 } } : original;
      void verify(next, on);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(original, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${original!.id.replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    const consent = await run(() => api('passport/share', { body: { recipientOrgId: recipient, purpose: 'Credit assessment' } }));
    if (consent) setShare(consent);
  };

  if (!original || !shown) return <Rows />;
  const { claims } = original;
  return (
    <>
      <PageHead title="Trade Passport" intro={`${original.subject.legalName}. A signed record of verified trades that a lender can check without calling Cashew.`} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tier" value={`Tier ${claims.tier}`} delta={claims.tier < 3 ? 'Tier 3 after 4 repaid trades' : 'Established'} />
        <StatCard label="Verified trades" value={claims.completedTrades} />
        <StatCard label="On-time repayment" value={`${data.onTimeRate}%`} />
        <StatCard label="Total financed" value={claims.totalFinancedInr} format={formatINR} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel flex min-w-0 flex-col gap-3 p-4">
          <h2>Credential</h2>
          <KeyValues rows={[['Issuer', original.issuer], ['Issued', formatDate(original.issuedAt)], ['Expires', formatDate(original.expiresAt)], ['Signature', 'Ed25519']]} />
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">Show the signed JSON</summary>
            <pre data-testid="credential" className="mt-2 max-h-80 overflow-auto border border-rule bg-paper p-3 font-mono text-label">{JSON.stringify(shown, null, 2)}</pre>
          </details>
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="field-label mb-1 block">Share with</span>
              <select className="input w-auto" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                {(me?.lenders ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.legalName}</option>)}
              </select>
            </label>
            <Button loading={busy} onClick={generate}>Generate share link</Button>
            <Button onClick={download}>Download credential (.json)</Button>
          </div>
          {share && (
            <div role="status">
              <Callout tone="pass" title="Share link created (simulated)">
                <p className="break-all font-mono text-label">cashew.demo/passport/{share.id}</p>
                <p className="mt-1">For {me?.lenders.find((l: any) => l.id === share.recipientOrgId)?.legalName}, purpose: {share.purpose}. Expires {formatDate(share.expiresAt)}.</p>
              </Callout>
            </div>
          )}
        </section>
        <section className="panel flex flex-col gap-3 p-4">
          <h2>Verify</h2>
          <p className="text-table text-ink-2">The check runs in this browser, using the public key in the credential.</p>
          <div><Button variant="primary" onClick={() => void verify()}>Verify in your browser</Button></div>
          <label className="flex min-h-11 items-center gap-3 font-medium">
            <input type="checkbox" role="switch" className="size-5" checked={tamper} onChange={(e) => toggleTamper(e.target.checked)} />
            Tamper: change completed trades from {claims.completedTrades} to {claims.completedTrades === 9 ? 10 : 9}
          </label>
          {result && (
            <div role="status">
              {result.valid ? (
                <Callout tone="pass" title="Signature valid">Checked with {result.method}.</Callout>
              ) : (
                <Callout tone="fail" title="Signature invalid. Contents were changed.">Checked with {result.method}.</Callout>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
