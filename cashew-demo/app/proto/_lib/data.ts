// Sample data from Blueprint Section 6 (Scenario B). All people, firms and numbers are fictional.
import type { Fee } from '@/lib/engines/matching';
import type { StringKey } from './strings';

export const FX = 85;

export const trade = {
  ref: 'CSH-2627-00412',
  exporter: 'Kaveri Textiles Pvt Ltd',
  buyer: 'Northgate Apparel Ltd',
  invoiceNo: 'KT/2627/0231',
  route: 'INTUT → GBFXT',
  originalUsd: 30000,
  amendedUsd: 26250,
};

export type CheckStatus = 'pass' | 'fail' | 'unknown' | 'pending';

export interface Check {
  id: number;
  title: Record<'en' | 'hi' | 'ta', string>;
  source: string;
  computed?: boolean;
  status: CheckStatus;
  line: string;
  at: string;
  ref: string;
}

export const checks: Check[] = [
  { id: 1, title: { en: 'Business is active', hi: 'व्यवसाय सक्रिय है', ta: 'வணிகம் செயலில் உள்ளது' }, source: 'MCA, Udyam', status: 'pass', line: 'MCA: active, incorporated 2016. Udyam registered.', at: '3 Nov 2026, 14:02 IST', ref: '9c41e07a…02bd' },
  { id: 2, title: { en: 'IEC is valid', hi: 'IEC मान्य है', ta: 'IEC செல்லுபடியாகும்' }, source: 'DGFT', status: 'pass', line: 'IEC active, no restrictions.', at: '3 Nov 2026, 14:02 IST', ref: '4be0917d…77a1' },
  { id: 3, title: { en: 'Promoter identity', hi: 'प्रमोटर की पहचान', ta: 'நிறுவனர் அடையாளம்' }, source: 'KYC provider', status: 'pass', line: 'Promoter PAN matches name (consented KYC).', at: '3 Nov 2026, 14:02 IST', ref: 'd17c3a90…41fe' },
  { id: 4, title: { en: 'GST filing record', hi: 'GST फ़ाइलिंग रिकॉर्ड', ta: 'GST தாக்கல் பதிவு' }, source: 'GST', status: 'pass', line: 'GSTIN active, last 12 returns filed (11 on time).', at: '3 Nov 2026, 14:02 IST', ref: '20f8b6c1…9a0c' },
  { id: 5, title: { en: 'Invoice is authentic', hi: 'इनवॉइस असली है', ta: 'விலைப்பட்டியல் உண்மையானது' }, source: 'e-Invoice', status: 'pass', line: 'e-Invoice IRN found, signed QR valid.', at: '3 Nov 2026, 14:03 IST', ref: '7a2d55e8…c310' },
  { id: 6, title: { en: 'Goods movement documents', hi: 'माल ढुलाई के दस्तावेज़', ta: 'சரக்கு நகர்வு ஆவணங்கள்' }, source: 'Shipping Bill, BL', status: 'pass', line: 'Shipping Bill and Bill of Lading both present.', at: '3 Nov 2026, 14:03 IST', ref: 'b3906f12…e84d' },
  { id: 7, title: { en: 'Shipment status', hi: 'शिपमेंट की स्थिति', ta: 'ஏற்றுமதி நிலை' }, source: 'Carrier', status: 'unknown', line: 'Carrier tracking not yet available. Forwarder confirmation requested.', at: '3 Nov 2026, 14:03 IST', ref: 'e60a18b7…5d22' },
  { id: 8, title: { en: 'Documents agree with each other', hi: 'दस्तावेज़ आपस में मेल खाते हैं', ta: 'ஆவணங்கள் ஒன்றோடொன்று பொருந்துகின்றன' }, source: 'Your documents', computed: true, status: 'fail', line: 'Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.', at: '3 Nov 2026, 14:03 IST', ref: '7f3a91c2…c91e' },
  { id: 9, title: { en: 'Buyer standing', hi: 'खरीदार की साख', ta: 'வாங்குபவர் நிலை' }, source: 'Buyer registry', status: 'pass', line: 'Buyer registered, 8 years of filings, rating B+. No platform payment history yet.', at: '3 Nov 2026, 14:03 IST', ref: '1dc7a4f3…608b' },
  { id: 10, title: { en: 'Sanctions screening', hi: 'प्रतिबंध जाँच', ta: 'தடைகள் சோதனை' }, source: 'Screening lists', status: 'pass', line: 'No matches on 3 screening lists.', at: '3 Nov 2026, 14:03 IST', ref: '58be20d6…f19a' },
  { id: 11, title: { en: 'Related-party check', hi: 'संबंधित पक्ष जाँच', ta: 'தொடர்புடைய தரப்பு சோதனை' }, source: 'Company records', status: 'pass', line: 'No name, address, director or bank overlap.', at: '3 Nov 2026, 14:03 IST', ref: 'a94c01e7…3b6c' },
  { id: 12, title: { en: 'Not financed elsewhere', hi: 'कहीं और वित्त नहीं लिया', ta: 'வேறெங்கும் நிதி பெறவில்லை' }, source: 'Cashew registry', status: 'pass', line: 'No match in the duplicate-financing registry.', at: '3 Nov 2026, 14:04 IST', ref: 'c2f77d31…a05e' },
  { id: 13, title: { en: 'Bank account ownership', hi: 'बैंक खाते का स्वामित्व', ta: 'வங்கிக் கணக்கு உரிமை' }, source: 'Penny drop', status: 'pass', line: 'Penny-drop name match: KAVERI TEXTILES PVT LTD.', at: '3 Nov 2026, 14:04 IST', ref: '36a1e9fc…d748' },
  { id: 14, title: { en: 'Buyer acknowledgement', hi: 'खरीदार की पुष्टि', ta: 'வாங்குபவர் ஒப்புதல்' }, source: 'Buyer link', status: 'pending', line: 'Buyer has not yet confirmed. We sent a link.', at: 'Link sent 3 Nov 2026, 14:04 IST', ref: '—' },
];

export interface DocField {
  label: string;
  value: string;
  confidence: number;
  tone?: 'bad' | 'ok';
}

// Documents compared by check 8. The amended invoice replaces the invoice after the fix.
export const docInvoice: DocField[] = [
  { label: 'Invoice no.', value: 'KT/2627/0231', confidence: 0.98 },
  { label: 'Buyer', value: 'Northgate Apparel Limited', confidence: 0.95 },
  { label: 'HS code', value: '610910', confidence: 0.96 },
  { label: 'Quantity', value: '4,800 pcs', confidence: 0.98, tone: 'bad' },
  { label: 'Amount', value: 'USD 30,000', confidence: 0.99, tone: 'bad' },
];
export const docInvoiceAmended: DocField[] = [
  { label: 'Invoice no.', value: 'KT/2627/0231', confidence: 0.98 },
  { label: 'Buyer', value: 'Northgate Apparel Limited', confidence: 0.95 },
  { label: 'HS code', value: '610910', confidence: 0.96 },
  { label: 'Quantity', value: '4,200 pcs', confidence: 0.98, tone: 'ok' },
  { label: 'Amount', value: 'USD 26,250', confidence: 0.99, tone: 'ok' },
];
export const docBl: DocField[] = [
  { label: 'BL no.', value: 'SEFX26110418', confidence: 0.93 },
  { label: 'Consignee', value: 'NORTHGATE APPAREL LTD.', confidence: 0.92 },
  { label: 'HS code', value: '610910', confidence: 0.9 },
  { label: 'Quantity', value: '4,200 pcs', confidence: 0.97, tone: 'ok' },
  { label: 'Port of discharge', value: 'GBFXT', confidence: 0.82 },
];

export const compareRows = {
  before: [
    { doc: 'Purchase Order', qty: '4,800 pcs (partial allowed)', value: 'USD 30,000', bad: false },
    { doc: 'Commercial Invoice', qty: '4,800 pcs', value: 'USD 30,000', bad: true },
    { doc: 'Packing List', qty: '4,200 pcs', value: '—', bad: false },
    { doc: 'Shipping Bill', qty: '4,200 pcs', value: 'FOB USD 26,250', bad: false },
    { doc: 'Bill of Lading', qty: '4,200 pcs', value: '—', bad: false },
  ],
  after: [
    { doc: 'Purchase Order', qty: '4,800 pcs (partial allowed)', value: 'USD 30,000', bad: false },
    { doc: 'Commercial Invoice (amended)', qty: '4,200 pcs', value: 'USD 26,250', bad: false },
    { doc: 'Packing List', qty: '4,200 pcs', value: '—', bad: false },
    { doc: 'Shipping Bill', qty: '4,200 pcs', value: 'FOB USD 26,250', bad: false },
    { doc: 'Bill of Lading', qty: '4,200 pcs', value: '—', bad: false },
  ],
};

export interface SampleOffer {
  id: string;
  lender: string;
  product: string;
  advancePct: number;
  ratePct: number;
  tenureDays: number;
  fees: Fee[];
  disbursalHours: number;
  recourse: string;
  collateral: string;
  conditions: string;
  validDays: number;
}

export const INVOICE_VALUE_INR = trade.amendedUsd * FX;

export const offers: SampleOffer[] = [
  {
    id: 'banyan', lender: 'Banyan Capital', product: 'Export invoice discounting',
    advancePct: 85, ratePct: 11.5, tenureDays: 90,
    fees: [{ label: 'Processing 0.50%', kind: 'pctAdvance', value: 0.5, statedIn: 'headline' }],
    disbursalHours: 48, recourse: 'Recourse', collateral: 'None',
    conditions: 'Standard assignment of receivable.', validDays: 7,
  },
  {
    id: 'tidewater', lender: 'Tidewater Finance', product: 'Export invoice discounting',
    advancePct: 90, ratePct: 10.2, tenureDays: 90,
    fees: [
      { label: 'Processing 0.60%', kind: 'pctAdvance', value: 0.6, statedIn: 'headline' },
      { label: 'Documentation', kind: 'flat', value: 3500, statedIn: 'headline' },
      { label: 'FX spread 0.8%', kind: 'pctAdvance', value: 0.8, statedIn: 'conditions' },
    ],
    disbursalHours: 24, recourse: 'Recourse', collateral: 'None',
    conditions: 'FX conversion spread of 0.8% applies on remittance proceeds.', validDays: 3,
  },
  {
    id: 'meridian', lender: 'Meridian Bank', product: 'Post-shipment credit',
    advancePct: 80, ratePct: 10.4, tenureDays: 90,
    fees: [
      { label: 'Processing 0.25%', kind: 'pctAdvance', value: 0.25, statedIn: 'headline' },
      { label: 'ECGC cover 0.30% of invoice', kind: 'pctInvoice', value: 0.3, statedIn: 'headline' },
    ],
    disbursalHours: 72, recourse: 'Recourse, ECGC-backed', collateral: 'None',
    conditions: 'ECGC cover required before disbursal.', validDays: 7,
  },
];

export type StepState = 'done' | 'current' | 'upcoming';

export interface Step {
  key: string;
  title: Record<'en' | 'hi' | 'ta', string>;
  by?: string;
  at?: string;
}

export const steps: Step[] = [
  { key: 'submitted', title: { en: 'Submitted', hi: 'जमा किया', ta: 'சமர்ப்பிக்கப்பட்டது' }, by: 'Kaveri Textiles', at: '3 Nov 2026, 13:58 IST' },
  { key: 'verified', title: { en: 'Verified', hi: 'सत्यापित', ta: 'சரிபார்க்கப்பட்டது' }, by: 'Cashew checks, 12 of 14 passed', at: '3 Nov 2026, 14:06 IST' },
  { key: 'financed', title: { en: 'Financed', hi: 'वित्त मिला', ta: 'நிதி பெறப்பட்டது' }, by: 'Meridian Bank', at: '6 Nov 2026, 11:20 IST' },
  { key: 'loaded', title: { en: 'Loaded', hi: 'लोड हुआ', ta: 'ஏற்றப்பட்டது' }, by: 'Forwarder', at: '8 Nov 2026, 17:45 IST' },
  { key: 'sailed', title: { en: 'Sailed', hi: 'रवाना हुआ', ta: 'புறப்பட்டது' }, by: 'Carrier (simulated)', at: '10 Nov 2026, 06:10 IST' },
  { key: 'arrived', title: { en: 'Arrived at port', hi: 'बंदरगाह पहुँचा', ta: 'துறைமுகம் சேர்ந்தது' }, by: 'Carrier (simulated)', at: '2 Dec 2026, 09:30 IST' },
  { key: 'delivered', title: { en: 'Delivered', hi: 'पहुँचा दिया', ta: 'வழங்கப்பட்டது' } },
  { key: 'repaid', title: { en: 'Repaid', hi: 'चुकाया गया', ta: 'திருப்பிச் செலுத்தப்பட்டது' } },
];

export const signalLabels: Record<string, StringKey> = {
  invoiceNo: 'sigInvoiceNo',
  amount: 'sigAmount',
  date: 'sigDate',
  currency: 'sigCurrency',
  irn: 'sigIrn',
};
