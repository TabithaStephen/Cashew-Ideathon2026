// The three lenders and their products (Blueprint Sections 6.1 and 6.5). All fictional.
import type { LenderProduct, Org } from '@/lib/types';

export const BANYAN = 'lender_banyan';
export const TIDEWATER = 'lender_tidewater';
export const MERIDIAN = 'lender_meridian';

export const LENDER_ORGS: Org[] = [
  { id: BANYAN, type: 'lender', legalName: 'Banyan Capital', kind: 'NBFC' },
  { id: TIDEWATER, type: 'lender', legalName: 'Tidewater Finance', kind: 'Fintech' },
  { id: MERIDIAN, type: 'lender', legalName: 'Meridian Bank', kind: 'Private bank' },
];

const COMMON = {
  sectors: ['Textiles'],
  corridors: ['IN-GB'],
  buyerCountries: ['GB'],
  maxTenureDays: 120,
  active: true,
};

export const PRODUCTS: LenderProduct[] = [
  {
    ...COMMON,
    id: 'prod_banyan_eid',
    lenderId: BANYAN,
    name: 'Export invoice discounting',
    type: 'Invoice discounting',
    minTicket: 5_00_000,
    maxTicket: 1_00_00_000,
    minStrength: 60,
    requiredDocs: ['invoice', 'shippingBill', 'bl'],
    pricingModel: 'Fixed rate, processing fee on advance',
    collateralRules: 'None',
    pricing: { advancePct: 85, ratePct: 11.5, fees: [{ label: 'Processing fee', kind: 'pctAdvance', value: 0.5, statedIn: 'headline' }], recourse: true, collateral: 'None', conditions: 'Standard assignment of receivable.', disbursalHours: 48, validityDays: 7, responseSeconds: 8 },
  },
  {
    ...COMMON,
    id: 'prod_tidewater_eid',
    lenderId: TIDEWATER,
    name: 'Export invoice discounting',
    type: 'Invoice discounting',
    minTicket: 2_00_000,
    maxTicket: 75_00_000,
    minStrength: 50,
    requiredDocs: ['invoice', 'bl'],
    pricingModel: 'Fixed rate, processing and documentation fees',
    collateralRules: 'None',
    pricing: {
      advancePct: 90,
      ratePct: 10.2,
      fees: [
        { label: 'Processing fee', kind: 'pctAdvance', value: 0.6, statedIn: 'headline' },
        { label: 'Documentation', kind: 'flat', value: 3500, statedIn: 'headline' },
        { label: 'FX conversion spread', kind: 'pctAdvance', value: 0.8, statedIn: 'conditions' },
      ],
      recourse: true,
      collateral: 'None',
      conditions: 'FX conversion spread of 0.8% applies on remittance proceeds.',
      disbursalHours: 24,
      validityDays: 3,
      responseSeconds: 4,
    },
  },
  {
    ...COMMON,
    id: 'prod_meridian_psc',
    lenderId: MERIDIAN,
    name: 'Post-shipment credit',
    type: 'Post-shipment credit',
    minTicket: 10_00_000,
    maxTicket: 5_00_00_000,
    minStrength: 60,
    requiredDocs: ['po', 'invoice', 'packing', 'shippingBill', 'bl'],
    pricingModel: 'Fixed rate, ECGC cover required',
    collateralRules: 'None, ECGC cover required',
    pricing: {
      advancePct: 80,
      ratePct: 10.4,
      fees: [
        { label: 'Processing fee', kind: 'pctAdvance', value: 0.25, statedIn: 'headline' },
        { label: 'ECGC cover premium', kind: 'pctInvoice', value: 0.3, statedIn: 'headline' },
      ],
      recourse: true,
      recourseNote: 'Recourse, ECGC-backed',
      collateral: 'None',
      conditions: 'ECGC policy cover to be in place before disbursal.',
      disbursalHours: 72,
      validityDays: 7,
      responseSeconds: 12,
    },
  },
];
