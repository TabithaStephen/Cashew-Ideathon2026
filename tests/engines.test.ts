import { describe, expect, it } from 'vitest';
import { crossCheck, namesMatch } from '@/lib/engines/crossdoc';
import { computeRiskProfile } from '@/lib/engines/risk';
import { computeOffer, offerFromProduct, rankOffers } from '@/lib/engines/matching';
import { appendEntry, checkRegistry, verifyChain, fingerprint } from '@/lib/engines/registry';
import { issuePassport, verifyPassport } from '@/lib/engines/passport';
import { SAMPLES, resolveDates } from '@/lib/seed/scenarios';
import { PRODUCTS } from '@/lib/seed/lenders';
import { ORGS, BUYERS } from '@/lib/seed/orgs';
import { buildSeed } from '@/lib/seed';
import type { CheckResult, ExtractedFields } from '@/lib/types';
import { inr } from '@/lib/format';

const docs = (key: 'A' | 'B' | 'C1' | 'C2', amended = false) => {
  const d = resolveDates(SAMPLES[key].docs) as Record<string, ExtractedFields>;
  if (amended) d.invoice = resolveDates(SAMPLES.B.amendedInvoice!);
  return d;
};

describe('crossdoc (11.3)', () => {
  it('Scenario B flags exactly the planted quantity mismatch as the headline', () => {
    const r = crossCheck(docs('B'));
    expect(r.pass).toBe(false);
    expect(r.headline).toBe('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.');
    expect(r.interpretation).toBe('600 pcs were not shipped. The invoice may overstate the goods by USD 3,750.');
    expect(r.findings.some((f) => f.severity === 'note' && /Packing List and Shipping Bill agree/.test(f.message))).toBe(true);
  });
  it('does not raise a false positive on "Limited" vs "LTD."', () => {
    expect(namesMatch('Northgate Apparel Limited', 'NORTHGATE APPAREL LTD.')).toBe(true);
    const r = crossCheck(docs('B'));
    expect(r.findings.filter((f) => f.field === 'buyer' && f.severity === 'mismatch')).toHaveLength(0);
    expect(r.findings.some((f) => f.field === 'buyer' && f.severity === 'note' && /matched after normalising/.test(f.message))).toBe(true);
  });
  it('amended invoice passes, with partial shipment as info', () => {
    const r = crossCheck(docs('B', true));
    expect(r.pass).toBe(true);
    expect(r.findings.some((f) => f.severity === 'note' && /Partial shipment, permitted by PO/.test(f.message))).toBe(true);
  });
  it('Scenario A is clean', () => expect(crossCheck(docs('A')).pass).toBe(true));
});

describe('risk (11.2)', () => {
  const all = (over: Record<number, CheckResult>) => Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, over[i + 1] ?? 'pass'])) as Record<number, CheckResult>;
  it('Scenario A = 92.8 Strong', () => {
    const p = computeRiskProfile('t', all({ 7: 'unknown', 14: 'pending' }), 90);
    expect(p.strength).toBe(92.8); expect(p.band).toBe('Strong'); expect(p.blocking).toEqual([]);
  });
  it('Scenario B pre-amendment = 82.8 but blocking #8 forces Limited', () => {
    const p = computeRiskProfile('t', all({ 7: 'unknown', 8: 'fail', 14: 'pending' }), 90);
    expect(p.strength).toBe(82.8); expect(p.band).toBe('Limited'); expect(p.blocking).toEqual([8]);
  });
  it('lender weights change the result', () => {
    const r = all({ 7: 'unknown', 14: 'pending' });
    expect(computeRiskProfile('t', r, 90, [1, 2, 1, 1]).strength).not.toBe(92.8);
    expect(computeRiskProfile('t', r, 90, [0, 0, 0, 1]).strength).toBe(100);
  });
});

describe('matching (11.5) reproduces the Scenario B offers in 6.5', () => {
  const V = 26250 * 85;
  const now = new Date('2026-11-03T10:00:00Z');
  const offers = PRODUCTS.map((p, i) => offerFromProduct(p, 't', 90, now, `o${i}`));
  const m = Object.fromEntries(offers.map((o) => [o.lenderId, computeOffer(o, V)]));
  it('effective costs', () => {
    expect((m.lender_banyan.effectiveAPR * 100).toFixed(2)).toBe('13.53');
    expect((m.lender_tidewater.effectiveAPR * 100).toFixed(2)).toBe('16.58');
    expect((m.lender_meridian.effectiveAPR * 100).toFixed(2)).toBe('12.93');
  });
  it('totals, net cash and the hidden fee', () => {
    expect(inr(m.lender_banyan.totalCost)).toBe('₹63,262');
    expect(inr(m.lender_tidewater.totalCost)).toBe('₹82,119');
    expect(inr(m.lender_meridian.totalCost)).toBe('₹56,930');
    expect(inr(m.lender_banyan.netCash)).toBe('₹18,87,080');
    expect(inr(m.lender_tidewater.netCash)).toBe('₹19,76,511');
    expect(inr(m.lender_meridian.netCash)).toBe('₹17,73,844');
    expect(inr(m.lender_tidewater.hiddenFees)).toBe('₹16,065');
    expect(inr(m.lender_banyan.interest)).toBe('₹53,779');
    expect(inr(m.lender_meridian.advance)).toBe('₹17,85,000');
    expect(inr(m.lender_banyan.advance)).toBe('₹18,96,562');
    expect(inr(m.lender_meridian.fees[0].amount)).toBe('₹4,462');
    expect(inr(m.lender_meridian.fees[1].amount)).toBe('₹6,694');
    expect(inr(m.lender_tidewater.fees[0].amount)).toBe('₹12,049');
    expect(inr(m.lender_tidewater.advance)).toBe('₹20,08,125');
  });
  it('default order is Meridian, Banyan, Tidewater', () => {
    const ranked = rankOffers(offers.map((offer) => ({ offer, maths: computeOffer(offer, V) })));
    expect(ranked.map((r) => r.offer.lenderId)).toEqual(['lender_meridian', 'lender_banyan', 'lender_tidewater']);
  });
});

describe('registry (11.4)', () => {
  const s = buildSeed('C');
  const cks = ORGS.find((o) => o.id === 'org_cks')!, hart = BUYERS.find((b) => b.id === 'buyer_hartwell')!;
  const idOf = (key: 'C1' | 'C2') => {
    const f = docs(key).invoice.fields;
    return { supplierId: cks.gstin!, buyerId: hart.registrationId, invoiceNo: String(f.invoiceNo.value), invoiceDate: String(f.invoiceDate.value), amount: Number(f.amount.value), currency: 'USD', irn: String(f.irn.value) };
  };
  it('seed has 13 entries and an intact chain', () => {
    expect(s.registry).toHaveLength(13);
    expect(verifyChain(s.registry).ok).toBe(true);
  });
  it('attempt 1 (exact copy) returns FINANCED_BY_OTHER without lender identity', () => {
    const r = checkRegistry(s.registry, s.registryIndex, idOf('C1'), 'lender_meridian');
    expect(r.result).toBe('FINANCED_BY_OTHER');
    expect(r.matchedFingerprint).toBe(fingerprint(idOf('C1')));
    expect(JSON.stringify(r)).not.toMatch(/banyan/i);
  });
  it('attempt 2 (altered copy) is a POSSIBLE_DUPLICATE at about 0.87; without the IRN it would be 0.77', () => {
    const r = checkRegistry(s.registry, s.registryIndex, idOf('C2'));
    expect(r.result).toBe('POSSIBLE_DUPLICATE');
    expect(r.similarity!.overall).toBeCloseTo(0.87, 2);
    expect(r.similarity!.invoiceNoDistance).toBe(2);
    const noIrn = checkRegistry(s.registry, s.registryIndex, { ...idOf('C2'), irn: undefined });
    expect(noIrn.result).toBe('NONE');
    expect(noIrn.similarity!.overall).toBeCloseTo(0.77, 2);
  });
  it('verifyChain fails after a single byte is changed', () => {
    const chain = JSON.parse(JSON.stringify(s.registry));
    chain[4].timestamp = chain[4].timestamp.replace(/.$/, (c: string) => (c === 'Z' ? 'X' : 'Z'));
    const v = verifyChain(chain);
    expect(v.ok).toBe(false); expect(v.brokenAt).toBe(5);
  });
  it('appending keeps the chain valid', () => {
    const chain = JSON.parse(JSON.stringify(s.registry)), index = [] as never[];
    appendEntry(chain, index, { identity: idOf('C2'), lenderId: 'lender_x', status: 'FINANCED', timestamp: new Date().toISOString() });
    expect(verifyChain(chain).ok).toBe(true);
  });
});

describe('passport (11.6)', () => {
  const s = buildSeed('B');
  const kaveri = s.orgs.find((o) => o.id === 'org_kaveri')!;
  it('verifies, starts at tier 2, and fails after one claim is edited', () => {
    const c = issuePassport(kaveri, s.trades, new Date());
    expect(c.claims.completedTrades).toBe(3);
    expect(c.claims.tier).toBe(2);
    expect(verifyPassport(c)).toBe(true);
    const tampered = JSON.parse(JSON.stringify(c));
    tampered.claims.completedTrades = 9;
    expect(verifyPassport(tampered)).toBe(false);
  });
});
