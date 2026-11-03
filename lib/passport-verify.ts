// Browser-side Passport verification (Blueprint 11.6): WebCrypto Ed25519, tweetnacl fallback. No network.
import nacl from 'tweetnacl';
import { canonicalJSON } from './canonical';

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export interface VerifyOutcome { valid: boolean; method: 'WebCrypto Ed25519' | 'tweetnacl (fallback)'; }

export async function verifyCredentialInBrowser(cred: { proof: { publicKey: string; signature: string } } & Record<string, unknown>): Promise<VerifyOutcome> {
  const { proof, ...body } = cred;
  const msg = new TextEncoder().encode(canonicalJSON(body));
  const sig = b64ToBytes(proof.signature);
  const pub = b64ToBytes(proof.publicKey);
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('no subtle');
    const key = await subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']);
    const valid = await subtle.verify({ name: 'Ed25519' }, key, sig, msg);
    return { valid, method: 'WebCrypto Ed25519' };
  } catch {
    return { valid: nacl.sign.detached.verify(msg, sig, pub), method: 'tweetnacl (fallback)' };
  }
}
