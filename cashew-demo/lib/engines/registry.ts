// Duplicate-financing registry (Blueprint Section 11.4). REAL: SHA-256, a hash chain and Ed25519.
// Check results never carry a lender's identity.
import { createHash, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
import { canonicalJSON } from '@/lib/canonical';
import { levenshtein as levenshteinOf, similarity, type InvoiceFacts, type SimilaritySignal } from '@/lib/engines/fuzzy';
import type { RegistryEntry, RegistryMatchRow } from '@/lib/types';

export const sha256 = (input: string) => createHash('sha256').update(input).digest('hex');
export const GENESIS = '0'.repeat(64);

const PKCS8_ED25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
export function keyFromSeed(seedHex: string): { privateKey: KeyObject; publicKey: KeyObject } {
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' });
  return { privateKey, publicKey: createPublicKey(privateKey) };
}

export interface InvoiceIdentity extends InvoiceFacts {
  supplierId: string;
  buyerId: string;
}

export function fingerprint(salt: string, inv: InvoiceIdentity): string {
  const canonical = [
    salt,
    inv.supplierId.trim().toUpperCase(),
    inv.buyerId.trim().toUpperCase(),
    inv.invoiceNo.trim().toUpperCase(),
    inv.date.slice(0, 10),
    inv.amount.toFixed(2),
    inv.currency.trim().toUpperCase(),
  ];
  return sha256(canonical.join('|'));
}

export const irnFingerprint = (salt: string, irn?: string) => (irn ? sha256(`${salt}|IRN|${irn.trim().toUpperCase()}`) : undefined);

type EntryBody = Pick<RegistryEntry, 'position' | 'fingerprint' | 'irnFingerprint' | 'lenderId' | 'status' | 'timestamp' | 'refersTo'>;

function hashEntry(prevHash: string, body: EntryBody) {
  return sha256(prevHash + canonicalJSON(body));
}

export function appendEntry(log: RegistryEntry[], body: Omit<EntryBody, 'position'>, privateKey: KeyObject): RegistryEntry {
  const prevHash = log.length > 0 ? log[log.length - 1].entryHash : GENESIS;
  const full: EntryBody = { position: log.length + 1, ...body };
  const entryHash = hashEntry(prevHash, full);
  const signature = sign(null, Buffer.from(entryHash, 'hex'), privateKey).toString('base64');
  const entry: RegistryEntry = { ...full, prevHash, entryHash, signature };
  log.push(entry);
  return entry;
}

export interface ChainResult {
  intact: boolean;
  entries: number;
  brokenAt?: number;
  reason?: string;
}

export function verifyChain(log: RegistryEntry[], publicKey: KeyObject): ChainResult {
  let prev = GENESIS;
  for (let i = 0; i < log.length; i++) {
    const { prevHash, entryHash, signature, ...body } = log[i];
    const broken = (reason: string): ChainResult => ({ intact: false, entries: log.length, brokenAt: body.position, reason });
    if (body.position !== i + 1) return broken('Position is out of order.');
    if (prevHash !== prev) return broken('The link to the previous entry is broken.');
    if (hashEntry(prev, body) !== entryHash) return broken('The entry was changed after it was written.');
    if (!verify(null, Buffer.from(entryHash, 'hex'), publicKey, Buffer.from(signature, 'base64'))) return broken('The signature is not valid.');
    prev = entryHash;
  }
  return { intact: true, entries: log.length };
}

export type RegistryCode = 'NONE' | 'FINANCED_BY_OTHER' | 'POSSIBLE_DUPLICATE' | 'RELEASED';

export interface RegistryCheck {
  code: RegistryCode;
  fingerprint: string;
  irnFingerprint?: string;
  /** The registry's own fingerprint on an exact match. It's the same value, so it reveals nothing new. */
  matchedFingerprint?: string;
  similarity?: { overall: number; signals: SimilaritySignal[]; invoiceNoDistance: number; amountGapPct: number; dayGap: number };
}

const partyHash = (salt: string, id: string) => sha256(`${salt}|PARTY|${id.trim().toUpperCase()}`);

export function matchRow(salt: string, position: number, inv: InvoiceIdentity): RegistryMatchRow {
  return {
    position,
    supplierHash: partyHash(salt, inv.supplierId),
    buyerHash: partyHash(salt, inv.buyerId),
    invoiceNo: inv.invoiceNo,
    amount: inv.amount,
    date: inv.date,
    currency: inv.currency,
    irn: inv.irn,
  };
}

/** The newest entry for this fingerprint decides its status, because the log is append-only. */
const latestFor = (log: RegistryEntry[], fp: string) => [...log].reverse().find((e) => e.fingerprint === fp);

export function checkRegistry(log: RegistryEntry[], index: RegistryMatchRow[], salt: string, inv: InvoiceIdentity, askingLenderId?: string): RegistryCheck {
  const fp = fingerprint(salt, inv);
  const base = { fingerprint: fp, irnFingerprint: irnFingerprint(salt, inv.irn) };
  const exact = latestFor(log, fp);
  if (exact) {
    if (exact.status !== 'FINANCED') return { code: 'RELEASED', ...base };
    if (exact.lenderId !== askingLenderId) return { code: 'FINANCED_BY_OTHER', ...base, matchedFingerprint: exact.fingerprint };
    return { code: 'NONE', ...base };
  }

  const supplier = partyHash(salt, inv.supplierId);
  const buyer = partyHash(salt, inv.buyerId);
  let best: RegistryCheck | undefined;
  for (const row of index) {
    if (row.supplierHash !== supplier || row.buyerHash !== buyer) continue;
    const entry = log.find((e) => e.position === row.position);
    if (!entry || latestFor(log, entry.fingerprint)?.status !== 'FINANCED') continue;
    const compared = similarity(inv, row);
    if (compared.flagged && compared.score > (best?.similarity?.overall ?? 0)) {
      best = {
        code: 'POSSIBLE_DUPLICATE',
        ...base,
        similarity: {
          overall: Math.round(compared.score * 100) / 100,
          signals: compared.signals,
          invoiceNoDistance: levenshteinOf(inv.invoiceNo, row.invoiceNo),
          amountGapPct: Math.round((Math.abs(inv.amount - row.amount) / row.amount) * 1000) / 10,
          dayGap: Math.round(Math.abs(Date.parse(inv.date) - Date.parse(row.date)) / 86_400_000),
        },
      };
    }
  }
  return best ?? { code: 'NONE', ...base };
}

