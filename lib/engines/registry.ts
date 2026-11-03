// Duplicate-financing registry (Blueprint 11.4). REAL: SHA-256 fingerprints, signed append-only
// hash chain, fuzzy matching. External anchoring is STAGED (see API route).
import { canonicalJSON } from '../canonical';
import { REGISTRY_SALT, sha256, signRegistry, verifyRegistry } from '../crypto';
import type { RegistryCheckCode, RegistryEntry, RegistryIndexRow, RegistryStatus } from '../types';

export const GENESIS_HASH = '0'.repeat(64);
export const FUZZY_THRESHOLD = 0.8;

export interface InvoiceIdentity {
  supplierId: string; buyerId: string; invoiceNo: string; invoiceDate: string; amount: number; currency: string; irn?: string;
}

const norm = (s: string) => s.trim().toUpperCase();
const isoDate = (d: string) => new Date(d).toISOString().slice(0, 10);

export function canonicalInvoiceString(i: InvoiceIdentity): string {
  return [REGISTRY_SALT, norm(i.supplierId), norm(i.buyerId), norm(i.invoiceNo), isoDate(i.invoiceDate), Number(i.amount).toFixed(2), norm(i.currency)].join('|');
}
export const fingerprint = (i: InvoiceIdentity) => sha256(canonicalInvoiceString(i));
export const irnFingerprint = (irn?: string) => (irn ? sha256(`${REGISTRY_SALT}|IRN|${norm(irn)}`) : undefined);
export const partyHash = (id: string) => sha256(`${REGISTRY_SALT}|PARTY|${norm(id)}`);

function entryBody(e: Omit<RegistryEntry, 'prevHash' | 'entryHash' | 'signature'>) {
  return { position: e.position, fingerprint: e.fingerprint, irnFingerprint: e.irnFingerprint, lenderId: e.lenderId, status: e.status, timestamp: e.timestamp, refPosition: e.refPosition };
}
export const computeEntryHash = (prevHash: string, body: object) => sha256(prevHash + canonicalJSON(body));

/** Append a new entry (never edits existing ones). Returns the new entry. */
export function appendEntry(
  chain: RegistryEntry[], index: RegistryIndexRow[],
  args: { identity?: InvoiceIdentity; fingerprint?: string; irnFp?: string; lenderId: string; status: RegistryStatus; timestamp: string; refPosition?: number },
): RegistryEntry {
  const position = chain.length + 1;
  const fp = args.fingerprint ?? fingerprint(args.identity!);
  const irnFp = args.irnFp ?? irnFingerprint(args.identity?.irn);
  const body = entryBody({ position, fingerprint: fp, irnFingerprint: irnFp, lenderId: args.lenderId, status: args.status, timestamp: args.timestamp, refPosition: args.refPosition });
  const prevHash = chain.length ? chain[chain.length - 1].entryHash : GENESIS_HASH;
  const entryHash = computeEntryHash(prevHash, body);
  const entry: RegistryEntry = { ...body, prevHash, entryHash, signature: signRegistry(entryHash) };
  if (entry.irnFingerprint === undefined) delete entry.irnFingerprint;
  if (entry.refPosition === undefined) delete entry.refPosition;
  chain.push(entry);
  if (args.identity && args.status === 'FINANCED') {
    const i = args.identity;
    index.push({ position, supplierHash: partyHash(i.supplierId), buyerHash: partyHash(i.buyerId), invoiceNo: norm(i.invoiceNo), amount: Number(i.amount), invoiceDate: isoDate(i.invoiceDate), currency: norm(i.currency), irnFingerprint: irnFp, fingerprint: fp });
  }
  return entry;
}

export interface ChainVerification { ok: boolean; count: number; brokenAt?: number; reason?: string; head: string; }
export function verifyChain(chain: RegistryEntry[]): ChainVerification {
  let prev = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.position !== i + 1) return { ok: false, count: chain.length, brokenAt: i + 1, reason: 'Position out of sequence', head: prev };
    if (e.prevHash !== prev) return { ok: false, count: chain.length, brokenAt: e.position, reason: 'Previous-hash link broken', head: prev };
    const h = computeEntryHash(prev, entryBody(e));
    if (h !== e.entryHash) return { ok: false, count: chain.length, brokenAt: e.position, reason: 'Entry contents do not match its hash', head: prev };
    if (!verifyRegistry(e.entryHash, e.signature)) return { ok: false, count: chain.length, brokenAt: e.position, reason: 'Signature invalid', head: prev };
    prev = e.entryHash;
  }
  return { ok: true, count: chain.length, head: prev };
}

/** Latest status for a FINANCED entry, following later SETTLED/RELEASED entries that reference it. */
export function currentStatus(chain: RegistryEntry[], position: number): RegistryStatus {
  let s: RegistryStatus = chain[position - 1]?.status ?? 'FINANCED';
  for (const e of chain) if (e.refPosition === position) s = e.status;
  return s;
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export interface Similarity {
  overall: number; invoiceNoDistance: number;
  signals: { invoiceNo: number; amount: number; date: number; currency: number; irn: number };
  amountDiffPct: number; dateDiffDays: number; supplierEqual: boolean; buyerEqual: boolean; irnEqual: boolean;
}

export function similarity(i: InvoiceIdentity, row: RegistryIndexRow): Similarity {
  const a = norm(i.invoiceNo), b = row.invoiceNo;
  const dist = levenshtein(a, b);
  const inv = 1 - dist / Math.max(a.length, b.length, 1);
  const amountDiffPct = (Math.abs(i.amount - row.amount) / row.amount) * 100;
  const amt = amountDiffPct <= 1 ? 1 : amountDiffPct >= 10 ? 0 : 1 - (amountDiffPct - 1) / 9;
  const dateDiffDays = Math.abs((new Date(isoDate(i.invoiceDate)).getTime() - new Date(row.invoiceDate).getTime()) / 86_400_000);
  const date = Math.max(0, 1 - dateDiffDays / 14);
  const cur = norm(i.currency) === row.currency ? 1 : 0;
  const irnFp = irnFingerprint(i.irn);
  const irnEqual = !!irnFp && !!row.irnFingerprint && irnFp === row.irnFingerprint;
  const signals = { invoiceNo: 0.3 * inv, amount: 0.3 * amt, date: 0.2 * date, currency: 0.1 * cur, irn: irnEqual ? 0.1 : 0 };
  const overall = Object.values(signals).reduce((s, x) => s + x, 0);
  return { overall: Math.round(overall * 1000) / 1000, invoiceNoDistance: dist, signals, amountDiffPct: Math.round(amountDiffPct * 100) / 100, dateDiffDays, supplierEqual: true, buyerEqual: true, irnEqual };
}

export interface RegistryCheck {
  result: RegistryCheckCode; fingerprint: string; matchedFingerprint?: string; similarity?: Similarity; matchedPosition?: number;
}

/** Check an invoice against the registry. Never reveals another lender's identity. */
export function checkRegistry(chain: RegistryEntry[], index: RegistryIndexRow[], i: InvoiceIdentity, requestingLenderId?: string): RegistryCheck {
  const fp = fingerprint(i);
  const exact = chain.filter((e) => e.fingerprint === fp && e.status === 'FINANCED');
  for (const e of exact) {
    const status = currentStatus(chain, e.position);
    if (status !== 'FINANCED') return { result: 'RELEASED', fingerprint: fp, matchedFingerprint: e.fingerprint, matchedPosition: e.position };
    if (requestingLenderId && e.lenderId === requestingLenderId) continue; // same lender re-checking its own commit
    return { result: 'FINANCED_BY_OTHER', fingerprint: fp, matchedFingerprint: e.fingerprint, matchedPosition: e.position };
  }
  if (exact.length) return { result: 'NONE', fingerprint: fp };
  const sup = partyHash(i.supplierId), buy = partyHash(i.buyerId);
  let best: { row: RegistryIndexRow; sim: Similarity } | undefined;
  for (const row of index) {
    if (row.supplierHash !== sup || row.buyerHash !== buy) continue;
    if (currentStatus(chain, row.position) !== 'FINANCED') continue;
    const sim = similarity(i, row);
    if (!best || sim.overall > best.sim.overall) best = { row, sim };
  }
  if (best && best.sim.overall >= FUZZY_THRESHOLD) {
    return { result: 'POSSIBLE_DUPLICATE', fingerprint: fp, matchedFingerprint: best.row.fingerprint, similarity: best.sim, matchedPosition: best.row.position };
  }
  return { result: 'NONE', fingerprint: fp, similarity: best?.sim };
}

/** Mask lender identities: "Lender #1", "Lender #2"… in order of first appearance. */
export function lenderMask(chain: RegistryEntry[]): Record<string, string> {
  const map: Record<string, string> = {};
  let k = 0;
  for (const e of chain) if (!(e.lenderId in map)) map[e.lenderId] = `Lender #${++k}`;
  return map;
}
