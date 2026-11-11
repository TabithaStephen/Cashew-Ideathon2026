// Eligibility and offer maths (Blueprint Section 11.5). Pure, so the lender preview runs it in the browser.
// Commission is deliberately absent: it is not an input to anything here.
import type { DocType, EligibilityDecision, Fee, LenderProduct, Offer, Trade } from '@/lib/types';

export type { Fee };

export interface OfferTerms {
  invoiceValue: number;
  advancePct: number;
  ratePct: number;
  tenureDays: number;
  fees: Fee[];
}

export interface FeeLine extends Fee {
  amount: number;
  hidden: boolean;
}

export interface NormalisedOffer {
  advance: number;
  interest: number;
  feeLines: FeeLine[];
  totalFees: number;
  totalCost: number;
  effectiveApr: number; // percent
  netCash: number;
}

export function normaliseOffer(t: OfferTerms): NormalisedOffer {
  const advance = (t.invoiceValue * t.advancePct) / 100;
  const interest = (advance * (t.ratePct / 100) * t.tenureDays) / 365;
  const feeLines: FeeLine[] = t.fees.map((fee) => {
    const amount =
      fee.kind === 'flat'
        ? fee.value
        : ((fee.kind === 'pctAdvance' ? advance : t.invoiceValue) * fee.value) / 100;
    return { ...fee, amount, hidden: fee.statedIn === 'conditions' };
  });
  const totalFees = feeLines.reduce((sum, line) => sum + line.amount, 0);
  const totalCost = interest + totalFees;
  return {
    advance,
    interest,
    feeLines,
    totalFees,
    totalCost,
    effectiveApr: (totalCost / advance) * (365 / t.tenureDays) * 100,
    netCash: advance - totalFees,
  };
}

/** Pulls percentages out of conditions text, so a fee stated only in the small print can't hide. */
export function parseConditionFees(conditions: string): Fee[] {
  const fees: Fee[] = [];
  for (const sentence of conditions.split(/(?<=[.;])\s+/)) {
    const match = sentence.match(/^(.*?)\s+of\s+(\d+(?:\.\d+)?)%/i);
    if (match) fees.push({ label: match[1].trim(), kind: 'pctAdvance', value: Number(match[2]), statedIn: 'conditions' });
  }
  return fees;
}

/** The structured fees, plus anything found in the conditions that isn't already listed. */
export function allFees(fees: Fee[], conditions: string): Fee[] {
  const parsed = parseConditionFees(conditions).filter(
    (found) => !fees.some((fee) => fee.statedIn === 'conditions' && fee.kind !== 'flat' && fee.value === found.value),
  );
  return [...fees, ...parsed];
}

export interface EligibilityInput {
  trade: Pick<Trade, 'sector' | 'corridor' | 'buyerCountry' | 'paymentTermsDays'> & { valueInr: number };
  docTypes: DocType[];
  strength: number;
}

export function productReasons(product: LenderProduct, input: EligibilityInput): string[] {
  const { trade, docTypes, strength } = input;
  const inr = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
  const reasons: string[] = [];
  if (!product.active) reasons.push('Product is not active.');
  if (!product.sectors.includes(trade.sector)) reasons.push(`Sector ${trade.sector} is not covered.`);
  if (!product.corridors.includes(trade.corridor)) reasons.push(`Corridor ${trade.corridor} is not covered.`);
  if (!product.buyerCountries.includes(trade.buyerCountry)) reasons.push(`Buyer country ${trade.buyerCountry} is not covered.`);
  if (trade.valueInr < product.minTicket || trade.valueInr > product.maxTicket) {
    reasons.push(`Ticket ${inr(trade.valueInr)} is outside the range ${inr(product.minTicket)} to ${inr(product.maxTicket)}.`);
  }
  if (trade.paymentTermsDays > product.maxTenureDays) reasons.push(`Tenure of ${trade.paymentTermsDays} days is above the ${product.maxTenureDays}-day maximum.`);
  const missing = product.requiredDocs.filter((doc) => !docTypes.includes(doc));
  if (missing.length > 0) reasons.push(`Required documents are missing: ${missing.join(', ')}.`);
  if (strength < product.minStrength) reasons.push(`Evidence strength ${strength} is below this lender's threshold of ${product.minStrength}.`);
  return reasons;
}

export function decideEligibility(
  lenders: Array<{ id: string; legalName: string }>,
  products: LenderProduct[],
  input: EligibilityInput,
): EligibilityDecision[] {
  return lenders.map((lender) => {
    const own = products.filter((p) => p.lenderId === lender.id);
    const checked = own.map((product) => ({ product, reasons: productReasons(product, input) }));
    const winner = checked.find((c) => c.reasons.length === 0);
    return {
      lenderId: lender.id,
      lenderName: lender.legalName,
      productId: winner?.product.id,
      eligible: Boolean(winner),
      reasons: winner ? [] : checked.flatMap((c) => c.reasons),
    };
  });
}

export type SortKey = 'cost' | 'fastest' | 'cash';

export interface RankableOffer {
  id: string;
  effectiveApr: number;
  netCash: number;
  disbursalHours: number;
}

export function rankOffers<T extends RankableOffer>(offers: T[], sort: SortKey = 'cost'): T[] {
  const key: Record<SortKey, (o: T) => number> = {
    cost: (o) => o.effectiveApr,
    fastest: (o) => o.disbursalHours,
    cash: (o) => -o.netCash,
  };
  return [...offers].sort((a, b) => key[sort](a) - key[sort](b) || a.effectiveApr - b.effectiveApr);
}

export function normaliseStoredOffer(offer: Pick<Offer, 'advancePct' | 'ratePct' | 'tenureDays' | 'fees' | 'conditions'>, invoiceValue: number) {
  return normaliseOffer({ invoiceValue, advancePct: offer.advancePct, ratePct: offer.ratePct, tenureDays: offer.tenureDays, fees: allFees(offer.fees, offer.conditions) });
}

export interface Settlement {
  netToExporter: number;
  buyerPays: number;
  lenderRecovers: number;
  balanceToExporter: number;
  exporterTotal: number;
  totalCost: number;
}

/**
 * Where the money goes. The blueprint gives no settlement rule, so this assumes the plain invoice-discounting
 * flow: the buyer pays the full invoice, the lender keeps its advance plus interest, the rest goes to the exporter.
 */
export function settlement(o: { invoiceValue: number; advance: number; interest: number; totalFees: number }): Settlement {
  const netToExporter = o.advance - o.totalFees;
  const lenderRecovers = o.advance + o.interest;
  const balanceToExporter = o.invoiceValue - lenderRecovers;
  return { netToExporter, buyerPays: o.invoiceValue, lenderRecovers, balanceToExporter, exporterTotal: netToExporter + balanceToExporter, totalCost: o.interest + o.totalFees };
}
