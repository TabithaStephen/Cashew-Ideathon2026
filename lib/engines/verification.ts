// Verification runner (Blueprint 11.1). REAL runner; staged checks read the seeded source table
// through one adapter interface; check 8 is computed (crossdoc), check 12 queries the real registry.
import { canonicalJSON } from '../canonical';
import { sha256 } from '../crypto';
import type { Buyer, CheckResult, Doc, DocType, Org, RegistryEntry, RegistryIndexRow, Trade } from '../types';
import { crossCheck } from './crossdoc';
import { checkRegistry, type InvoiceIdentity } from './registry';

export interface StagedSourceRow { result: CheckResult; line: string; evidence: Record<string, unknown> }
export type StagedTable = Record<number, StagedSourceRow>;

export interface TradeContext {
  trade: Trade; org: Org; buyer: Buyer; docs: Partial<Record<DocType, Doc>>;
  staged: StagedTable; registry: RegistryEntry[]; registryIndex: RegistryIndexRow[];
  now: string;
}
export interface CheckOutput { result: CheckResult; line: string; evidence: unknown }

export interface CheckDef {
  id: number; title: string; source: string; mode: 'staged' | 'real'; manualFallback: boolean;
  run(ctx: TradeContext): Promise<CheckOutput>;
}

/** Adapter rule (Technical Master H): every staged source goes through the same interface. */
const stagedAdapter = (id: number) => async (ctx: TradeContext): Promise<CheckOutput> => {
  const row = ctx.staged[id];
  if (!row) return { result: 'unknown', line: 'Source did not respond. Manual fallback available.', evidence: { adapter: 'staged', checkId: id, response: null } };
  return { result: row.result, line: row.line, evidence: { adapter: 'staged', simulated: true, queriedAt: ctx.now, ...row.evidence } };
};

export function invoiceIdentity(ctx: Pick<TradeContext, 'org' | 'buyer' | 'docs'>): InvoiceIdentity | null {
  const inv = ctx.docs.invoice?.extracted.fields;
  if (!inv) return null;
  return {
    supplierId: ctx.org.gstin ?? ctx.org.id, buyerId: ctx.buyer.registrationId,
    invoiceNo: String(inv.invoiceNo?.value ?? ''), invoiceDate: String(inv.invoiceDate?.value ?? ''),
    amount: Number(inv.amount?.value ?? 0), currency: String(inv.amount?.currency ?? 'USD'),
    irn: inv.irn ? String(inv.irn.value) : undefined,
  };
}

export const CHECKS: CheckDef[] = [
  { id: 1, title: 'Company registration', source: 'MCA and Udyam', mode: 'staged', manualFallback: true, run: stagedAdapter(1) },
  { id: 2, title: 'Importer-Exporter Code', source: 'DGFT (IEC)', mode: 'staged', manualFallback: true, run: stagedAdapter(2) },
  { id: 3, title: 'Promoter KYC', source: 'KYC (PAN)', mode: 'staged', manualFallback: true, run: stagedAdapter(3) },
  { id: 4, title: 'GST registration and filings', source: 'GST', mode: 'staged', manualFallback: true, run: stagedAdapter(4) },
  { id: 5, title: 'e-Invoice authenticity', source: 'e-Invoice IRP', mode: 'staged', manualFallback: true, run: stagedAdapter(5) },
  {
    id: 6, title: 'Shipping documents present', source: 'ICEGATE', mode: 'staged', manualFallback: true,
    async run(ctx) {
      const has = !!ctx.docs.shippingBill && !!ctx.docs.bl;
      const base = await stagedAdapter(6)(ctx);
      return has ? base : { result: 'fail', line: 'Shipping Bill or Bill of Lading is missing.', evidence: { ...(base.evidence as object), shippingBill: !!ctx.docs.shippingBill, bl: !!ctx.docs.bl } };
    },
  },
  {
    id: 7, title: 'Shipment tracking', source: 'Carrier', mode: 'staged', manualFallback: true,
    async run(ctx) {
      const stage = ctx.trade.shipmentStage ?? 0;
      if (stage >= 2) {
        const vessel = ctx.docs.bl?.extracted.fields.vessel?.value ?? 'vessel';
        return { result: 'pass', line: `Carrier confirms the container sailed on ${vessel}.`, evidence: { adapter: 'staged', simulated: true, carrierStatus: 'SAILED', vessel, queriedAt: ctx.now } };
      }
      return stagedAdapter(7)(ctx);
    },
  },
  {
    id: 8, title: 'Cross-document consistency', source: 'Computed', mode: 'real', manualFallback: false,
    async run(ctx) {
      const docs = Object.fromEntries(Object.entries(ctx.docs).map(([k, d]) => [k, d!.extracted]));
      const r = crossCheck(docs);
      return { result: r.pass ? 'pass' : 'fail', line: r.headline, evidence: { computed: true, documents: Object.fromEntries(Object.entries(ctx.docs).map(([k, d]) => [k, { file: d!.fileName, version: d!.version, sha256: d!.sha256 }])), findings: r.findings, table: r.table, interpretation: r.interpretation } };
    },
  },
  { id: 9, title: 'Buyer existence and standing', source: 'Buyer registry', mode: 'staged', manualFallback: true, run: stagedAdapter(9) },
  { id: 10, title: 'Sanctions and watchlist screening', source: 'Sanctions lists', mode: 'staged', manualFallback: true, run: stagedAdapter(10) },
  { id: 11, title: 'Related-party check', source: 'Corporate graph', mode: 'staged', manualFallback: true, run: stagedAdapter(11) },
  {
    id: 12, title: 'Duplicate-financing registry', source: 'Cashew registry', mode: 'real', manualFallback: false,
    async run(ctx) {
      const id = invoiceIdentity(ctx);
      if (!id) return { result: 'unknown', line: 'No invoice to check yet.', evidence: {} };
      const r = checkRegistry(ctx.registry, ctx.registryIndex, id);
      const base = { registryResult: r.result, attemptFingerprint: r.fingerprint, entriesSearched: ctx.registry.length };
      if (r.result === 'FINANCED_BY_OTHER')
        return { result: 'fail', line: 'This invoice has already been financed through Cashew. Details are not shared.', evidence: { ...base, registryFingerprint: r.matchedFingerprint } };
      if (r.result === 'POSSIBLE_DUPLICATE')
        return { result: 'warn', line: `Possible duplicate. Similarity ${r.similarity!.overall.toFixed(2)} to an invoice already financed.`, evidence: { ...base, registryFingerprint: r.matchedFingerprint, similarity: r.similarity } };
      if (r.result === 'RELEASED')
        return { result: 'pass', line: 'Matched an earlier entry that has been settled. Free to finance.', evidence: base };
      return { result: 'pass', line: 'No match in the duplicate-financing registry.', evidence: base };
    },
  },
  { id: 13, title: 'Bank account ownership', source: 'Bank (penny drop)', mode: 'staged', manualFallback: true, run: stagedAdapter(13) },
  {
    id: 14, title: 'Buyer confirmation', source: 'Buyer confirmation', mode: 'staged', manualFallback: true,
    async run(ctx) {
      if (ctx.trade.buyerConfirmed) return { result: 'pass', line: `${ctx.buyer.name} confirmed the invoice and payment terms.`, evidence: { adapter: 'staged', simulated: true, confirmedBy: 'Accounts payable', channel: 'Secure link', queriedAt: ctx.now } };
      return { result: 'pending', line: 'Buyer has not yet confirmed. We sent a link.', evidence: { adapter: 'staged', simulated: true, linkSentTo: 'ap@buyer (masked)', queriedAt: ctx.now } };
    },
  },
];

export const CHECK_BY_ID = Object.fromEntries(CHECKS.map((c) => [c.id, c])) as Record<number, CheckDef>;

/** Scripted durations (ms at 1x): ~12.4 s total, each 0.4 to 1.8 s. */
export const CHECK_DURATIONS: Record<number, number> = { 1: 600, 2: 700, 3: 900, 4: 1100, 5: 1000, 6: 500, 7: 1400, 8: 1800, 9: 900, 10: 800, 11: 700, 12: 1000, 13: 600, 14: 400 };

export function buildSchedule(checkIds: number[], speed: number) {
  let t = 0;
  return checkIds.map((checkId) => {
    const durationMs = speed === 0 ? 0 : Math.round(CHECK_DURATIONS[checkId] / speed);
    const row = { checkId, startMs: t, durationMs };
    t += durationMs;
    return row;
  });
}

export const evidenceHash = (evidence: unknown) => sha256(canonicalJSON(evidence));

export async function runCheck(id: number, ctx: TradeContext): Promise<CheckOutput & { evidenceHash: string; source: string; mode: 'staged' | 'real' }> {
  const def = CHECK_BY_ID[id];
  const out = await def.run(ctx);
  return { ...out, evidenceHash: evidenceHash(out.evidence), source: def.source, mode: def.mode };
}

/** Run all 14 in order (used by tests and Instant mode). */
export async function runAll(ctx: TradeContext) {
  const out: Record<number, Awaited<ReturnType<typeof runCheck>>> = {};
  for (const c of CHECKS) out[c.id] = await runCheck(c.id, ctx);
  return out;
}
