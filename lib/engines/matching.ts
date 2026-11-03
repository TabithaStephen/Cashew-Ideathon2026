// Matching and offer maths (Blueprint 11.5). REAL. Commission is not an input and does not exist.
import type { DocType, Fee, LenderProduct, Offer } from '../types';

export interface EligibilityInput {
  valueInr: number; tenureDays: number; sector: string; corridor: string; buyerCountry: string;
  docsPresent: DocType[]; strength: number;
}
export interface Eligibility { productId: string; lenderId: string; eligible: boolean; reasons: string[]; }

const lakh = (n: number) => `₹${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh`;

export function checkEligibility(p: LenderProduct, t: EligibilityInput): Eligibility {
  const reasons: string[] = [];
  if (!p.active) reasons.push('Product is paused');
  if (!p.sectors.includes(t.sector)) reasons.push(`Sector "${t.sector}" not covered`);
  if (!p.corridors.includes(t.corridor)) reasons.push(`Corridor ${t.corridor} not covered`);
  if (!p.buyerCountries.includes(t.buyerCountry)) reasons.push(`Buyer country ${t.buyerCountry} not covered`);
  if (t.valueInr < p.minTicket || t.valueInr > p.maxTicket)
    reasons.push(`Ticket ${lakh(t.valueInr)} outside range ${lakh(p.minTicket)} to ${lakh(p.maxTicket)}`);
  if (t.tenureDays > p.maxTenureDays) reasons.push(`Tenure ${t.tenureDays} days above maximum ${p.maxTenureDays}`);
  const missing = p.requiredDocs.filter((d) => !t.docsPresent.includes(d));
  if (missing.length) reasons.push(`Missing required documents: ${missing.join(', ')}`);
  if (t.strength < p.minStrength) reasons.push(`Evidence strength ${t.strength} below lender threshold ${p.minStrength}`);
  return { productId: p.id, lenderId: p.lenderId, eligible: reasons.length === 0, reasons };
}

/** Pull percentage fees out of free-text conditions (e.g. "FX conversion spread of 0.8% applies…"). */
export function parseConditionFees(conditions: string): Fee[] {
  const fees: Fee[] = [];
  const re = /([A-Za-z][A-Za-z \-]{2,40}?)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(conditions))) {
    const label = m[1].trim().replace(/^(an?|the)\s+/i, '');
    if (/premium|cover/i.test(label)) continue; // disclosed elsewhere as headline fees
    fees.push({ label: label.charAt(0).toUpperCase() + label.slice(1), kind: 'pctAdvance', value: Number(m[2]) / 100, statedIn: 'conditions' });
  }
  return fees;
}

export interface FeeLine extends Fee { amount: number; hidden: boolean; }
export interface OfferMaths {
  offerId: string; lenderId: string; valueInr: number; advance: number; interest: number;
  fees: FeeLine[]; totalFees: number; hiddenFees: number; totalCost: number; effectiveAPR: number; netCash: number;
  tenureDays: number; ratePct: number; advancePct: number;
}

/** Merge structured fees with any conditions-only fee the regex finds that isn't already listed. */
export function allFees(offer: Pick<Offer, 'fees' | 'conditions'>): Fee[] {
  const fees = [...offer.fees];
  for (const f of parseConditionFees(offer.conditions)) {
    const dup = fees.some((x) => x.statedIn === 'conditions' && Math.abs(x.value - f.value) < 1e-9);
    if (!dup) fees.push(f);
  }
  return fees;
}

export function computeOffer(offer: Offer, valueInr: number): OfferMaths {
  const V = valueInr, a = offer.advancePct, r = offer.ratePct, T = offer.tenureDays;
  const advance = V * a;
  const interest = (advance * r * T) / 365;
  const fees: FeeLine[] = allFees(offer).map((f) => {
    const amount = f.kind === 'flat' ? f.value : f.kind === 'pctAdvance' ? advance * f.value : V * f.value;
    return { ...f, amount, hidden: f.statedIn === 'conditions' };
  });
  const totalFees = fees.reduce((s, f) => s + f.amount, 0);
  const hiddenFees = fees.filter((f) => f.hidden).reduce((s, f) => s + f.amount, 0);
  const totalCost = interest + totalFees;
  const effectiveAPR = (totalCost / advance) * (365 / T);
  return { offerId: offer.id, lenderId: offer.lenderId, valueInr: V, advance, interest, fees, totalFees, hiddenFees, totalCost, effectiveAPR, netCash: advance - totalFees, tenureDays: T, ratePct: r, advancePct: a };
}

export type SortKey = 'cost' | 'fastest' | 'cash';
export function rankOffers<T extends { maths: OfferMaths; offer: Offer }>(items: T[], sort: SortKey = 'cost'): T[] {
  const s = [...items];
  if (sort === 'cost') s.sort((x, y) => x.maths.effectiveAPR - y.maths.effectiveAPR);
  else if (sort === 'fastest') s.sort((x, y) => x.offer.disbursalHours - y.offer.disbursalHours || x.maths.effectiveAPR - y.maths.effectiveAPR);
  else s.sort((x, y) => y.maths.netCash - x.maths.netCash);
  return s;
}

/** Build a lender's offer from its product pricing (staged lender response, real arithmetic). */
export function offerFromProduct(p: LenderProduct, tradeId: string, tenureDays: number, now: Date, id: string): Offer {
  const pr = p.pricing;
  const fees: Fee[] = [
    { label: 'Processing fee', kind: 'pctAdvance', value: pr.processingPct, statedIn: 'headline' },
    ...pr.extraFees.map((f) => ({ ...f })),
  ];
  return {
    id, tradeId, lenderId: p.lenderId, productId: p.id, advancePct: pr.advancePct, ratePct: pr.ratePct, tenureDays,
    fees, recourse: pr.recourse, recourseLabel: pr.recourseLabel, collateral: pr.collateral, conditions: pr.conditions,
    validUntil: new Date(now.getTime() + pr.validDays * 86_400_000).toISOString(), status: 'open',
    disbursalHours: pr.disbursalHours, submittedAt: now.toISOString(), scripted: true,
  };
}

export function badgesFor(items: { maths: OfferMaths; offer: Offer }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!items.length) return out;
  const add = (id: string, b: string) => (out[id] ??= []).push(b);
  const minBy = (f: (x: (typeof items)[0]) => number) => items.reduce((a, b) => (f(b) < f(a) ? b : a));
  add(minBy((x) => x.maths.effectiveAPR).offer.id, 'Lowest cost');
  add(minBy((x) => x.offer.disbursalHours).offer.id, 'Fastest');
  add(minBy((x) => -x.maths.netCash).offer.id, 'Most cash upfront');
  return out;
}
