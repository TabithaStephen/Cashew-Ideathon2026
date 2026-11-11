// Scenarios A, B and C (Blueprint Section 6). Dates are stored relative to an anchor and shifted to
// "demo today" when the seed is built, so the data never looks stale.
import { appendEntry, fingerprint, irnFingerprint, matchRow, sha256, type InvoiceIdentity } from '@/lib/engines/registry';
import { canonicalJSON } from '@/lib/canonical';
import { CHECKS, type ExternalSources } from '@/lib/engines/verification';
import { REGISTRY_SALT, registryKeys } from '@/lib/server/config';
import type { DemoState, Doc, DocSetId, DocType, ExtractedFields, ScenarioId, Trade, VerificationCheck } from '@/lib/types';
import { BANYAN, LENDER_ORGS, PRODUCTS, TIDEWATER } from './lenders';
import { BUYERS, CKS, HARTWELL, KAVERI, NORTHGATE, SME_ORGS } from './orgs';

import aPo from './docs/A-po.json';
import aInvoice from './docs/A-invoice.json';
import aPacking from './docs/A-packing.json';
import aSb from './docs/A-shippingBill.json';
import aBl from './docs/A-bl.json';
import bPo from './docs/B-po.json';
import bInvoice from './docs/B-invoice.json';
import bPacking from './docs/B-packing.json';
import bSb from './docs/B-shippingBill.json';
import bBl from './docs/B-bl.json';
import bAmended from './docs/B-amended.json';
import c1Po from './docs/C1-po.json';
import c1Invoice from './docs/C1-invoice.json';
import c1Packing from './docs/C1-packing.json';
import c1Sb from './docs/C1-shippingBill.json';
import c1Bl from './docs/C1-bl.json';
import c2Po from './docs/C2-po.json';
import c2Invoice from './docs/C2-invoice.json';
import c2Packing from './docs/C2-packing.json';
import c2Sb from './docs/C2-shippingBill.json';
import c2Bl from './docs/C2-bl.json';

const DAY = 86_400_000;
const ANCHOR = Date.parse('2026-11-03');
export const DOC_TYPES: DocType[] = ['po', 'invoice', 'packing', 'shippingBill', 'bl'];

type RawDoc = { docType: string; fields: Record<string, { value: unknown; confidence: number; unit?: string; currency?: string }> };
const SETS: Record<DocSetId, Record<DocType, RawDoc>> = {
  A: { po: aPo, invoice: aInvoice, packing: aPacking, shippingBill: aSb, bl: aBl },
  B: { po: bPo, invoice: bInvoice, packing: bPacking, shippingBill: bSb, bl: bBl },
  C1: { po: c1Po, invoice: c1Invoice, packing: c1Packing, shippingBill: c1Sb, bl: c1Bl },
  C2: { po: c2Po, invoice: c2Invoice, packing: c2Packing, shippingBill: c2Sb, bl: c2Bl },
};

function shifted(raw: RawDoc, now: Date): ExtractedFields {
  const days = Math.floor((Date.parse(now.toISOString().slice(0, 10)) - ANCHOR) / DAY);
  const out: ExtractedFields = {};
  for (const [key, field] of Object.entries(raw.fields)) {
    const { value } = field;
    const isDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    out[key] = { ...field, value: isDate ? new Date(Date.parse(value) + days * DAY).toISOString().slice(0, 10) : (value as string | number | boolean) };
  }
  return out;
}

export const extractedFor = (set: DocSetId, type: DocType, now: Date) => shifted(SETS[set][type], now);
export const amendedInvoice = (now: Date) => shifted(bAmended, now);
export const pdfFor = (set: DocSetId, type: DocType) => `/sample-docs/${set}-${type}.pdf`;
export const AMENDED_PDF = '/sample-docs/B-amended.pdf';

export const SAMPLE_TRADES: Record<DocSetId, { buyerId: string; goods: string; hsCode: string; value: number; incoterm: string; paymentTermsDays: number; scenario: ScenarioId; attempt?: 1 | 2 }> = {
  A: { buyerId: NORTHGATE, goods: 'Cotton knit T-shirts', hsCode: '610910', value: 18750, incoterm: 'FOB', paymentTermsDays: 90, scenario: 'A' },
  B: { buyerId: NORTHGATE, goods: 'Cotton knit T-shirts', hsCode: '610910', value: 30000, incoterm: 'FOB', paymentTermsDays: 90, scenario: 'B' },
  C1: { buyerId: HARTWELL, goods: 'Cotton knit T-shirts', hsCode: '610910', value: 18400, incoterm: 'FOB', paymentTermsDays: 90, scenario: 'C', attempt: 1 },
  C2: { buyerId: HARTWELL, goods: 'Cotton knit T-shirts', hsCode: '610910', value: 18900, incoterm: 'FOB', paymentTermsDays: 90, scenario: 'C', attempt: 2 },
};

/** The seeded table behind every staged check. Result lines are from Blueprint Section 6.3. */
export function sourcesFor(smeId: string): ExternalSources {
  const kaveri = smeId === KAVERI;
  const staged = (source: string, record: object) => ({ source, simulated: true, ...record });
  return {
    1: { result: 'pass', line: `MCA: active, incorporated ${kaveri ? 2016 : 2019}. Udyam registered.`, evidence: staged('MCA and Udyam', { companyStatus: 'Active', incorporated: kaveri ? 2016 : 2019, udyam: 'Registered' }) },
    2: { result: 'pass', line: 'IEC active, no restrictions.', evidence: staged('DGFT', { iecStatus: 'Active', restrictions: [] }) },
    3: { result: 'pass', line: 'Promoter PAN matches name (consented KYC).', evidence: staged('KYC provider', { panNameMatch: true, consented: true }) },
    4: { result: 'pass', line: 'GSTIN active, last 12 returns filed (11 on time).', evidence: staged('GST', { gstinStatus: 'Active', returnsFiled: 12, onTime: 11 }) },
    5: { result: 'pass', line: 'e-Invoice IRN found, signed QR valid.', evidence: staged('e-Invoice', { irnFound: true, signedQrValid: true }) },
    6: { result: 'pass', line: 'Shipping Bill and Bill of Lading both present.', evidence: staged('Customs', { shippingBill: 'Present', billOfLading: 'Present' }) },
    7: { result: 'unknown', line: 'Carrier tracking not yet available. Forwarder confirmation requested.', evidence: staged('Carrier', { tracking: 'Not available', forwarderAsked: true }) },
    9: { result: 'pass', line: kaveri ? 'Buyer registered, 8 years of filings, rating B+. No platform payment history yet.' : 'Buyer registered, 11 years of filings, rating BB. No platform payment history yet.', evidence: staged('Buyer registry', { registered: true, rating: kaveri ? 'B+' : 'BB' }) },
    10: { result: 'pass', line: 'No matches on 3 screening lists.', evidence: staged('Screening lists', { listsChecked: 3, matches: 0 }) },
    11: { result: 'pass', line: 'No name, address, director or bank overlap.', evidence: staged('Company records', { overlaps: [] }) },
    13: { result: 'pass', line: `Penny-drop name match: ${kaveri ? 'KAVERI TEXTILES PVT LTD' : 'COIMBATORE KNIT STUDIO LLP'}.`, evidence: staged('Penny drop', { nameMatch: true }) },
    14: { result: 'pending', line: 'Buyer has not yet confirmed. We sent a link.', evidence: staged('Buyer link', { linkSent: true, confirmed: false }) },
  };
}

function historyTrade(id: string, smeId: string, buyerId: string, invoiceNo: string, value: number, daysAgo: number, now: Date, scenario: ScenarioId): Trade {
  const at = new Date(now.getTime() - daysAgo * DAY).toISOString();
  return {
    id, smeId, buyerId, invoiceNo, value, scenario, corridor: 'IN-GB', buyerCountry: 'GB', sector: 'Textiles', goods: 'Cotton knit T-shirts', hsCode: '610910', currency: 'USD', fx: 85,
    incoterm: 'FOB', paymentTermsDays: 90, status: 'CLOSED', docSet: 'A', flaggedUnknownOrFailed: [], createdAt: at, updatedAt: at, repaidAt: at,
    buyerConfirmed: true, shipmentStage: 4, shipmentLog: [], deliveredOnTime: true, repaidOnTime: true, history: true,
  };
}

const identity = (t: Pick<Trade, 'smeId' | 'buyerId' | 'currency'>, invoiceNo: string, amount: number, date: string, irn?: string): InvoiceIdentity => ({ supplierId: t.smeId, buyerId: t.buyerId, invoiceNo, amount, date, currency: t.currency, irn });

export function buildSeed(scenario: ScenarioId, now: Date = new Date()): DemoState {
  const state: DemoState = {
    version: 1, scenario, speed: 1, stagedLabels: true, clockOffsetDays: 0, resetCount: 0, seq: 412,
    orgs: [...SME_ORGS, ...LENDER_ORGS], buyers: BUYERS, products: JSON.parse(JSON.stringify(PRODUCTS)),
    trades: [], docs: [], checks: [], runs: [], consents: [], offers: [], schedules: [], declines: [],
    registry: [], registryIndex: [], audit: [], queue: [], notifications: [], events: [], lastRanking: {}, lastPassportHash: {},
  };
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();

  if (scenario === 'C') {
    // Blueprint 6.4: one pre-seeded entry. Banyan financed CKS/2627/0188.
    const raw = extractedFor('C1', 'invoice', now);
    const inv = identity({ smeId: CKS, buyerId: HARTWELL, currency: 'USD' }, String(raw.invoiceNo.value), Number(raw.amount.value), String(raw.invoiceDate.value), String(raw.irn.value));
    const entry = appendEntry(state.registry, { fingerprint: fingerprint(REGISTRY_SALT, inv), irnFingerprint: irnFingerprint(REGISTRY_SALT, inv.irn), lenderId: BANYAN, status: 'FINANCED', timestamp: iso(40) }, registryKeys.privateKey);
    state.registryIndex.push(matchRow(REGISTRY_SALT, entry.position, inv));

    state.trades.push(
      historyTrade('CSH-2526-00187', CKS, HARTWELL, 'CKS/2526/0142', 11200, 240, now, 'C'),
      historyTrade('CSH-2526-00233', CKS, HARTWELL, 'CKS/2526/0177', 14600, 190, now, 'C'),
      historyTrade('CSH-2627-00041', CKS, HARTWELL, 'CKS/2627/0103', 9800, 130, now, 'C'),
    );

    // A second lender was mid-way on this invoice when Banyan's commit landed. Its Commit step is where the block shows.
    const raced: Trade = {
      ...historyTrade('CSH-2627-00398', CKS, HARTWELL, inv.invoiceNo, inv.amount, 42, now, 'C'),
      status: 'CONTRACT_SIGNED', docSet: 'C1', history: false, seededRace: true, repaidAt: undefined, deliveredOnTime: undefined, repaidOnTime: undefined,
      shipmentStage: 0, buyerConfirmed: true, acceptedOfferId: 'offer_race', signedAt: iso(41),
    };
    state.trades.push(raced);
    const sources = sourcesFor(CKS);
    const docFields: Partial<Record<DocType, ExtractedFields>> = {};
    for (const type of DOC_TYPES) {
      const extracted = extractedFor('C1', type, now);
      docFields[type] = extracted;
      const doc: Doc = { id: `doc_race_${type}`, tradeId: raced.id, type, sha256: sha256(canonicalJSON(extracted)), fileName: `${type}.pdf`, extracted, pdf: pdfFor('C1', type), verifiedStatus: 'pass', version: 1, uploadedAt: iso(42) };
      state.docs.push(doc);
    }
    for (const def of CHECKS) {
      const outcome = def.run({ trade: raced, docs: docFields, sources, registry: () => ({ code: 'NONE', fingerprint: fingerprint(REGISTRY_SALT, inv) }) });
      const check: VerificationCheck = { id: `chk_race_${def.id}`, tradeId: raced.id, checkId: def.id, result: outcome.result, line: outcome.line, source: def.source, mode: def.mode, evidence: outcome.evidence, evidenceHash: sha256(canonicalJSON(outcome.evidence)), runAt: iso(42), durationMs: def.durationMs };
      state.checks.push(check);
    }
    const pricing = PRODUCTS.find((p) => p.lenderId === TIDEWATER)!;
    state.offers.push({ id: 'offer_race', tradeId: raced.id, lenderId: TIDEWATER, productName: pricing.name, advancePct: pricing.pricing.advancePct, ratePct: pricing.pricing.ratePct, tenureDays: 90, fees: pricing.pricing.fees, recourse: true, collateral: 'None', conditions: pricing.pricing.conditions, disbursalHours: 24, validUntil: iso(38), status: 'accepted', scripted: true, receivedAt: iso(41) });
    state.consents.push({ id: 'consent_race', orgId: CKS, scope: `trade:${raced.id}`, recipientOrgId: TIDEWATER, purpose: 'Financing offers', grantedAt: iso(42), expiresAt: new Date(now.getTime() + 30 * DAY).toISOString() });
  } else {
    // Blueprint 6.6: three completed trades, all repaid on time, USD 12,000 to 22,000.
    const history = [
      historyTrade('CSH-2526-00212', KAVERI, NORTHGATE, 'KT/2526/0411', 12000, 310, now, scenario),
      historyTrade('CSH-2526-00298', KAVERI, NORTHGATE, 'KT/2526/0538', 18000, 220, now, scenario),
      historyTrade('CSH-2627-00077', KAVERI, NORTHGATE, 'KT/2627/0064', 22000, 130, now, scenario),
    ];
    state.trades.push(...history);
    const lenders = [BANYAN, TIDEWATER, BANYAN];
    history.forEach((trade, i) => {
      const inv = identity(trade, trade.invoiceNo!, trade.value, trade.createdAt.slice(0, 10));
      const fp = fingerprint(REGISTRY_SALT, inv);
      const opened = appendEntry(state.registry, { fingerprint: fp, lenderId: lenders[i], status: 'FINANCED', timestamp: trade.createdAt }, registryKeys.privateKey);
      state.registryIndex.push(matchRow(REGISTRY_SALT, opened.position, inv));
      appendEntry(state.registry, { fingerprint: fp, lenderId: lenders[i], status: 'SETTLED', refersTo: opened.position, timestamp: new Date(Date.parse(trade.createdAt) + 95 * DAY).toISOString() }, registryKeys.privateKey);
    });
  }
  return state;
}
