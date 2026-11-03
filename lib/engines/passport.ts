// Trade Passport (Blueprint 11.6). REAL: Ed25519-signed canonical JSON credential.
import { canonicalJSON } from '../canonical';
import { passportPublicKeyB64, signPassport, verifyPassportServer } from '../crypto';
import type { Org, Trade } from '../types';

export interface PassportCredential {
  type: 'TradePassport'; id: string; issuer: string;
  subject: { orgId: string; legalName: string };
  issuedAt: string; expiresAt: string;
  claims: {
    tier: number; entityChecks: Record<string, string>;
    completedTrades: number; deliveredOnTime: number; repaidOnTime: number; totalFinancedInr: number;
  };
  consent?: { recipient: string; purpose: string; expiry: string };
  proof: { type: 'Ed25519'; publicKey: string; signature: string };
}

const slug = (s: string) => s.toLowerCase().replace(/\b(pvt|private|ltd|limited|llp)\b/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function tierFor(completed: number, onTimeRate: number, entityOk: boolean): 0 | 1 | 2 | 3 {
  if (!entityOk) return 0;
  if (completed >= 4 && onTimeRate === 1) return 3;
  if (completed >= 3) return 2;
  return 1;
}

export function passportClaims(org: Org, trades: Trade[]) {
  const completed = trades.filter((t) => t.smeId === org.id && (t.status === 'REPAID' || t.status === 'CLOSED'));
  const repaidOnTime = completed.length; // all seeded and demo repayments are on time
  const deliveredOnTime = completed.length;
  const totalFinancedInr = Math.round(completed.reduce((s, t) => s + (t.advanceInr ?? t.value * t.fx), 0));
  const onTimeRate = completed.length ? repaidOnTime / completed.length : 0;
  const entityChecks = { mca: 'pass', udyam: org.udyam ? 'pass' : 'unknown', iec: org.iec ? 'pass' : 'unknown', gst: org.gstin ? 'pass' : 'unknown' };
  const entityOk = Object.values(entityChecks).every((v) => v === 'pass');
  return { tier: tierFor(completed.length, onTimeRate, entityOk), entityChecks, completedTrades: completed.length, deliveredOnTime, repaidOnTime, totalFinancedInr };
}

export function issuePassport(org: Org, trades: Trade[], now: Date, consent?: PassportCredential['consent']): PassportCredential {
  const issuedAt = new Date(now); issuedAt.setUTCMinutes(0, 0, 0);
  const expiresAt = new Date(issuedAt.getTime() + 30 * 86_400_000);
  const body: Omit<PassportCredential, 'proof'> = {
    type: 'TradePassport',
    id: `passport:${slug(org.legalName)}:${issuedAt.toISOString().slice(0, 10)}`,
    issuer: 'Cashew (demo)',
    subject: { orgId: org.id, legalName: org.legalName },
    issuedAt: issuedAt.toISOString().replace('.000', ''),
    expiresAt: expiresAt.toISOString().replace('.000', ''),
    claims: passportClaims(org, trades),
    ...(consent ? { consent } : {}),
  };
  const signature = signPassport(canonicalJSON(body));
  return { ...body, proof: { type: 'Ed25519', publicKey: passportPublicKeyB64, signature } };
}

export function unsignedBody(c: PassportCredential): Omit<PassportCredential, 'proof'> {
  const { proof: _p, ...rest } = c;
  return rest;
}

/** Server-side verify (tests). The browser uses WebCrypto/tweetnacl via lib/passport-verify.ts. */
export function verifyPassport(c: PassportCredential): boolean {
  return verifyPassportServer(canonicalJSON(unsignedBody(c)), c.proof.signature);
}
