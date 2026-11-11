// Passport verification, in the browser and with no network. Uses WebCrypto Ed25519 and falls back
// to the bundled tweetnacl where the browser doesn't have it. The result says which one ran.
import nacl from 'tweetnacl';
import { canonicalJSON } from '@/lib/canonical';

export interface PassportClaims {
  tier: number;
  entityChecks: Record<string, string>;
  completedTrades: number;
  deliveredOnTime: number;
  repaidOnTime: number;
  totalFinancedInr: number;
}

export interface UnsignedPassport {
  type: 'TradePassport';
  id: string;
  issuer: string;
  subject: { orgId: string; legalName: string };
  issuedAt: string;
  expiresAt: string;
  claims: PassportClaims;
  consent?: { recipient: string; purpose: string; expiry: string };
}

export interface TradePassport extends UnsignedPassport {
  proof: { type: 'Ed25519'; publicKey: string; signature: string };
}

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function verifyPassport(passport: TradePassport, forceFallback = false): Promise<{ valid: boolean; method: 'WebCrypto' | 'tweetnacl' }> {
  const { proof, ...body } = passport;
  const message = new TextEncoder().encode(canonicalJSON(body));
  const publicKey = bytes(proof.publicKey);
  const signature = bytes(proof.signature);
  if (!forceFallback) {
    try {
      const key = await crypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, ['verify']);
      return { valid: await crypto.subtle.verify({ name: 'Ed25519' }, key, signature, message), method: 'WebCrypto' };
    } catch {
      // This browser has no Ed25519 in WebCrypto. Fall through to the bundled library.
    }
  }
  return { valid: nacl.sign.detached.verify(message, signature, publicKey), method: 'tweetnacl' };
}
