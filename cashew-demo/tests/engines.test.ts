import { describe, expect, it } from 'vitest';
import { compareDocuments, type DocFields } from '@/lib/engines/crossdoc';
import { decideEligibility, normaliseStoredOffer, parseConditionFees, rankOffers, settlement } from '@/lib/engines/matching';
import { issuePassport } from '@/lib/engines/passport';
import { verifyPassport } from '@/lib/engines/passport-verify';
import { appendEntry, checkRegistry, fingerprint, matchRow, verifyChain, type InvoiceIdentity } from '@/lib/engines/registry';
import { computeRisk } from '@/lib/engines/risk';
import { LENDER_ORGS, PRODUCTS } from '@/lib/seed/lenders';
import { amendedInvoice, DOC_TYPES, extractedFor } from '@/lib/seed/scenarios';
import { passportKeys, passportPublicKeyB64, REGISTRY_SALT, registryKeys } from '@/lib/server/config';
import type { CheckResult, DocSetId, Org, RegistryEntry, Trade } from '@/lib/types';

const NOW = new Date('2026-11-03T10:00:00Z');
const docs = (set: DocSetId): DocFields => Object.fromEntries(DOC_TYPES.map((t) => [t, extractedFor(set, t, NOW)]));

describe('crossdoc (11.3)', () => {
  const b = compareDocuments(docs('B'));
  it('Scenario B fails on exactly the planted quantity mismatch', () => {
    expect(b.passed).toBe(false);
    expect(b.headline).toBe('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.');
    expect(b.notes.map((n) => n.message)).toContain('600 pcs were not shipped. The invoice may overstate the goods by USD 3,750.');
    expect(b.notes.map((n) => n.message)).toContain('Packing List and Shipping Bill agree with the Bill of Lading.');
  });
  it('does not raise a false mismatch on the buyer name', () => {
    expect(b.mismatches.filter((m) => m.field === 'buyer')).toEqual([]);
    expect(b.notes.find((n) => n.field === 'buyer')?.message).toBe('Buyer names matched after normalising.');
  });
  it('the amended invoice passes, with the partial shipment as a note', () => {
    const fixed = compareDocuments({ ...docs('B'), invoice: amendedInvoice(NOW) });
    expect(fixed.passed).toBe(true);
    expect(fixed.notes.map((n) => n.message)).toContain('Partial shipment, permitted by the PO.');
  });
  it('Scenarios A and C pass', () => {
    expect(compareDocuments(docs('A')).passed).toBe(true);
    expect(compareDocuments(docs('C1')).passed).toBe(true);
    expect(compareDocuments(docs('C2')).passed).toBe(true);
  });
  it('catches a real party mismatch, a date order problem and a port mismatch', () => {
    const d = docs('A');
    d.bl!.buyer = { value: 'Someone Else Ltd', confidence: 0.9 };
    d.invoice!.invoiceDate = { value: '2027-01-01', confidence: 0.9 };
    d.bl!.portDischarge = { value: 'GBLGP', confidence: 0.9 };
    const fields = compareDocuments(d).mismatches.map((m) => m.field);
    expect(fields).toEqual(expect.arrayContaining(['buyer', 'date', 'portDischarge']));
  });
});

describe('risk (11.2)', () => {
  const all = (over: Record<number, CheckResult>) => Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, over[i + 1] ?? 'pass'])) as Record<number, CheckResult>;
  it('Scenario A is 92.8 and Strong', () => {
    const r = computeRisk('t', all({ 7: 'unknown', 14: 'pending' }), 90);
    expect(r.strength).toBe(92.8);
    expect(r.band).toBe('Strong');
  });
  it('Scenario B is 82.8, but the blocking flag forces Limited', () => {
    const r = computeRisk('t', all({ 7: 'unknown', 8: 'fail', 14: 'pending' }), 90);
    expect(r.strength).toBe(82.8);
    expect(r.band).toBe('Limited');
    expect(r.blocking).toEqual([8]);
    expect(r.ruleVersion).toBe('rules-v0.1');
  });
  it('lender weights change the number', () => {
    const inputs = all({ 7: 'unknown', 14: 'pending', 9: 'fail' });
    expect(computeRisk('t', inputs, 90, [1, 1, 2, 1]).strength).toBeLessThan(computeRisk('t', inputs, 90).strength);
  });
  it('payment terms over 90 days lose structure points', () => {
    expect(computeRisk('t', all({}), 120).strength).toBe(97);
  });
});

describe('matching (11.5)', () => {
  const V = 2231250;
  const offer = (lender: string, t = 90) => {
    const { pricing } = PRODUCTS.find((p) => p.lenderId === lender)!;
    return normaliseStoredOffer({ advancePct: pricing.advancePct, ratePct: pricing.ratePct, tenureDays: t, fees: pricing.fees, conditions: pricing.conditions }, V);
  };
  it.each([
    ['lender_banyan', 13.53, 1887080, 63262],
    ['lender_tidewater', 16.58, 1976511, 82119],
    ['lender_meridian', 12.93, 1773844, 56930],
  ])('%s reproduces Section 6.5', (lender, apr, net, cost) => {
    const n = offer(lender);
    expect(n.effectiveApr.toFixed(2)).toBe(apr.toFixed(2));
    expect(Math.abs(n.netCash - net)).toBeLessThan(1);
    expect(Math.abs(n.totalCost - cost)).toBeLessThan(1);
  });
  it('flags the FX spread as hidden, without counting it twice', () => {
    const lines = offer('lender_tidewater').feeLines;
    expect(lines.filter((l) => l.hidden)).toHaveLength(1);
    expect(Math.round(lines.find((l) => l.hidden)!.amount)).toBe(16065);
  });
  it('parses a percentage out of conditions text', () => {
    expect(parseConditionFees('FX conversion spread of 0.8% applies on remittance proceeds.')[0]).toMatchObject({ label: 'FX conversion spread', value: 0.8, statedIn: 'conditions' });
  });
  it('a fee only in the conditions text still counts', () => {
    const n = normaliseStoredOffer({ advancePct: 90, ratePct: 10, tenureDays: 90, fees: [], conditions: 'Handling charge of 1% applies.' }, 100000);
    expect(n.totalFees).toBe(900);
  });
  it('ranks by cost by default', () => {
    const rows = ['lender_tidewater', 'lender_banyan', 'lender_meridian'].map((id) => ({ id, ...offer(id), disbursalHours: PRODUCTS.find((p) => p.lenderId === id)!.pricing.disbursalHours }));
    expect(rankOffers(rows).map((r) => r.id)).toEqual(['lender_meridian', 'lender_banyan', 'lender_tidewater']);
    expect(rankOffers(rows, 'fastest')[0].id).toBe('lender_tidewater');
    expect(rankOffers(rows, 'cash')[0].id).toBe('lender_tidewater');
  });
  it('settlement adds up: the exporter keeps the invoice minus the total cost', () => {
    const n = offer('lender_meridian');
    const s = settlement({ invoiceValue: V, advance: n.advance, interest: n.interest, totalFees: n.totalFees });
    expect(Math.round(s.netToExporter)).toBe(1773844);
    expect(Math.round(s.lenderRecovers)).toBe(1830774);
    expect(Math.round(s.balanceToExporter)).toBe(400476);
    expect(s.exporterTotal).toBeCloseTo(V - n.totalCost, 6);
  });
  it('has no commission anywhere in the offer type or the seed', () => {
    expect(JSON.stringify(PRODUCTS).toLowerCase()).not.toContain('commission');
  });
  it('eligibility filters and stores a reason', () => {
    const narrow = PRODUCTS.map((p) => (p.lenderId === 'lender_meridian' ? { ...p, maxTicket: 1000000 } : p));
    const input = { trade: { sector: 'Textiles', corridor: 'IN-GB', buyerCountry: 'GB', paymentTermsDays: 90, valueInr: V }, docTypes: DOC_TYPES, strength: 90 };
    const decided = decideEligibility(LENDER_ORGS, narrow, input);
    expect(decided.filter((d) => d.eligible).map((d) => d.lenderName)).toEqual(['Banyan Capital', 'Tidewater Finance']);
    expect(decided.find((d) => d.lenderName === 'Meridian Bank')!.reasons[0]).toContain('outside the range');
    expect(decideEligibility(LENDER_ORGS, PRODUCTS, { ...input, strength: 55 }).filter((d) => d.eligible).map((d) => d.lenderName)).toEqual(['Tidewater Finance']);
  });
});

describe('registry (11.4)', () => {
  const inv = (set: DocSetId): InvoiceIdentity => {
    const r = extractedFor(set, 'invoice', NOW);
    return { supplierId: 'org_cks', buyerId: 'buyer_hartwell', invoiceNo: String(r.invoiceNo.value), amount: Number(r.amount.value), date: String(r.invoiceDate.value), currency: 'USD', irn: String(r.irn.value) };
  };
  const setup = () => {
    const log: RegistryEntry[] = [];
    const entry = appendEntry(log, { fingerprint: fingerprint(REGISTRY_SALT, inv('C1')), lenderId: 'lender_banyan', status: 'FINANCED', timestamp: '2026-09-20T00:00:00Z' }, registryKeys.privateKey);
    return { log, index: [matchRow(REGISTRY_SALT, entry.position, inv('C1'))] };
  };
  it('attempt 1 is FINANCED_BY_OTHER and reveals no lender', () => {
    const { log, index } = setup();
    const r = checkRegistry(log, index, REGISTRY_SALT, inv('C1'), 'lender_tidewater');
    expect(r.code).toBe('FINANCED_BY_OTHER');
    expect(JSON.stringify(r)).not.toContain('banyan');
  });
  it('attempt 2 is POSSIBLE_DUPLICATE at about 0.87', () => {
    const { log, index } = setup();
    const r = checkRegistry(log, index, REGISTRY_SALT, inv('C2'), 'lender_tidewater');
    expect(r.code).toBe('POSSIBLE_DUPLICATE');
    expect(r.similarity!.overall).toBeCloseTo(0.87, 2);
    expect(r.similarity!.invoiceNoDistance).toBe(2);
    expect(r.similarity!.amountGapPct).toBe(2.7);
    expect(r.similarity!.dayGap).toBe(2);
  });
  it('without the matching IRN it stays under the threshold', () => {
    const { log, index } = setup();
    const r = checkRegistry(log, index, REGISTRY_SALT, { ...inv('C2'), irn: undefined }, 'lender_tidewater');
    expect(r.code).toBe('NONE');
  });
  it('a settled invoice is RELEASED', () => {
    const { log, index } = setup();
    appendEntry(log, { fingerprint: log[0].fingerprint, lenderId: 'lender_banyan', status: 'SETTLED', refersTo: 1, timestamp: '2026-10-20T00:00:00Z' }, registryKeys.privateKey);
    expect(checkRegistry(log, index, REGISTRY_SALT, inv('C1'), 'lender_tidewater').code).toBe('RELEASED');
  });
  it('a different supplier is never a fuzzy candidate', () => {
    const { log, index } = setup();
    expect(checkRegistry(log, index, REGISTRY_SALT, { ...inv('C2'), supplierId: 'org_kaveri' }).code).toBe('NONE');
  });
  it('verifyChain passes clean and fails after a single changed byte', () => {
    const { log } = setup();
    appendEntry(log, { fingerprint: 'a'.repeat(64), lenderId: 'lender_tidewater', status: 'FINANCED', timestamp: '2026-10-01T00:00:00Z' }, registryKeys.privateKey);
    expect(verifyChain(log, registryKeys.publicKey)).toEqual({ intact: true, entries: 2 });
    const tampered = JSON.parse(JSON.stringify(log)) as RegistryEntry[];
    tampered[0].fingerprint = `b${tampered[0].fingerprint.slice(1)}`;
    expect(verifyChain(tampered, registryKeys.publicKey)).toMatchObject({ intact: false, brokenAt: 1 });
    const badSig = JSON.parse(JSON.stringify(log)) as RegistryEntry[];
    badSig[1].signature = Buffer.from(Buffer.alloc(64, 7)).toString('base64');
    expect(verifyChain(badSig, registryKeys.publicKey)).toMatchObject({ intact: false, brokenAt: 2 });
  });
});

describe('passport (11.6)', () => {
  const org: Org = { id: 'org_kaveri', type: 'sme', legalName: 'Kaveri Textiles Pvt Ltd' };
  const repaid = (value: number) => ({ status: 'CLOSED', value, fx: 85, deliveredOnTime: true, repaidOnTime: true } as Trade);
  const passport = issuePassport(org, [repaid(12000), repaid(18000), repaid(22000), repaid(26250)], NOW.toISOString(), undefined, passportKeys.privateKey, passportPublicKeyB64);
  it('recomputes claims from trade history', () => {
    expect(passport.claims).toMatchObject({ tier: 3, completedTrades: 4, repaidOnTime: 4, totalFinancedInr: 6651250 });
  });
  it.each([[false], [true]])('verifies, and fails after one claim is edited (fallback: %s)', async (fallback) => {
    expect((await verifyPassport(passport, fallback)).valid).toBe(true);
    const edited = JSON.parse(JSON.stringify(passport));
    edited.claims.completedTrades = 9;
    expect((await verifyPassport(edited, fallback)).valid).toBe(false);
  });
});
