// Trade Passport signing (Blueprint Section 11.6). Node crypto on the server; see passport-verify.ts for the browser.
import { sign, type KeyObject } from 'node:crypto';
import { canonicalJSON } from '@/lib/canonical';
import type { Org, Trade } from '@/lib/types';
import type { PassportClaims, TradePassport, UnsignedPassport } from './passport-verify';

export function tierFor(completed: number): 0 | 1 | 2 | 3 {
  return completed >= 4 ? 3 : completed >= 3 ? 2 : completed >= 1 ? 1 : 0;
}

export function claimsFrom(trades: Trade[]): PassportClaims {
  const done = trades.filter((t) => t.status === 'REPAID' || t.status === 'CLOSED');
  return {
    tier: tierFor(done.length),
    entityChecks: { mca: 'pass', udyam: 'pass', iec: 'pass', gst: 'pass' },
    completedTrades: done.length,
    deliveredOnTime: done.filter((t) => t.deliveredOnTime).length,
    repaidOnTime: done.filter((t) => t.repaidOnTime).length,
    totalFinancedInr: Math.round(done.reduce((sum, t) => sum + t.value * t.fx, 0)),
  };
}

export function issuePassport(org: Org, trades: Trade[], nowIso: string, consent: UnsignedPassport['consent'], privateKey: KeyObject, publicKeyB64: string): TradePassport {
  const day = nowIso.slice(0, 10);
  const expires = new Date(Date.parse(day) + 30 * 86_400_000).toISOString();
  const body: UnsignedPassport = {
    type: 'TradePassport',
    id: `passport:${org.id}:${day}`,
    issuer: 'Cashew (demo)',
    subject: { orgId: org.id, legalName: org.legalName },
    issuedAt: `${day}T10:00:00.000Z`,
    expiresAt: expires,
    claims: claimsFrom(trades),
    consent,
  };
  const signature = sign(null, Buffer.from(canonicalJSON(body)), privateKey).toString('base64');
  return { ...body, proof: { type: 'Ed25519', publicKey: publicKeyB64, signature } };
}
