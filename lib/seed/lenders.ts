import type { LenderProduct } from '../types';

const common = {
  sectors: ['Textiles and apparel'], corridors: ['IN-GB', 'IN-EU'], buyerCountries: ['GB', 'SE', 'PT', 'DE'],
  requiredDocs: ['invoice', 'shippingBill', 'bl'] as LenderProduct['requiredDocs'], active: true,
};

/** Lender products (Blueprint 6.5). Pricing reproduces the Scenario B offers exactly. */
export const PRODUCTS: LenderProduct[] = [
  {
    ...common, id: 'prod_banyan_eid', lenderId: 'lender_banyan', name: 'Export invoice discounting', type: 'Export invoice discounting',
    minTicket: 5_00_000, maxTicket: 1_00_00_000, maxTenureDays: 120, minStrength: 60,
    pricing: { advancePct: 0.85, ratePct: 0.115, processingPct: 0.005, extraFees: [], disbursalHours: 48, recourse: true, recourseLabel: 'Recourse', collateral: 'None',
      conditions: 'Standard recourse to the exporter. Buyer confirmation required before disbursal.', validDays: 7, responseSeconds: 8 },
  },
  {
    ...common, id: 'prod_tidewater_eid', lenderId: 'lender_tidewater', name: 'Instant export discounting', type: 'Export invoice discounting',
    minTicket: 2_00_000, maxTicket: 50_00_000, maxTenureDays: 90, minStrength: 55,
    pricing: { advancePct: 0.9, ratePct: 0.102, processingPct: 0.006,
      extraFees: [
        { label: 'Documentation fee', kind: 'flat', value: 3500, statedIn: 'headline' },
        { label: 'FX conversion spread', kind: 'pctAdvance', value: 0.008, statedIn: 'conditions' },
      ],
      disbursalHours: 24, recourse: true, recourseLabel: 'Recourse', collateral: 'None',
      conditions: 'Disbursal within 24 hours of signing. FX conversion spread of 0.8% applies on remittance proceeds. Offer subject to buyer confirmation.', validDays: 3, responseSeconds: 4 },
  },
  {
    ...common, id: 'prod_meridian_psc', lenderId: 'lender_meridian', name: 'Post-shipment credit', type: 'Post-shipment credit',
    minTicket: 10_00_000, maxTicket: 5_00_00_000, maxTenureDays: 180, minStrength: 70,
    pricing: { advancePct: 0.8, ratePct: 0.104, processingPct: 0.0025,
      extraFees: [{ label: 'ECGC cover premium', kind: 'pctInvoice', value: 0.003, statedIn: 'headline' }],
      disbursalHours: 72, recourse: true, recourseLabel: 'Recourse, ECGC-backed', collateral: 'None',
      conditions: 'Subject to ECGC whole-turnover cover; premium disclosed in fees. Disbursal within 72 hours of signing.', validDays: 7, responseSeconds: 12 },
  },
];
