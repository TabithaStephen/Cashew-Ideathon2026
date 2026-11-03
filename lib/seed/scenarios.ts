// Scenario definitions (Blueprint Section 6). Dates are relative to "demo today" ("T-22" = 22 days ago).
import type { DocType, ExtractedFields, ScenarioId } from '../types';
import type { StagedTable } from '../engines/verification';

import Apo from './docs/A-po.json'; import Ainv from './docs/A-invoice.json'; import Apack from './docs/A-packing.json';
import Asb from './docs/A-shippingBill.json'; import Abl from './docs/A-bl.json';
import Bpo from './docs/B-po.json'; import Binv from './docs/B-invoice.json'; import Bpack from './docs/B-packing.json';
import Bsb from './docs/B-shippingBill.json'; import Bbl from './docs/B-bl.json'; import BinvAm from './docs/B-invoice-amended.json';
import C1po from './docs/C1-po.json'; import C1inv from './docs/C1-invoice.json'; import C1pack from './docs/C1-packing.json';
import C1sb from './docs/C1-shippingBill.json'; import C1bl from './docs/C1-bl.json';
import C2po from './docs/C2-po.json'; import C2inv from './docs/C2-invoice.json'; import C2pack from './docs/C2-packing.json';
import C2sb from './docs/C2-shippingBill.json'; import C2bl from './docs/C2-bl.json';

export type SampleKey = 'A' | 'B' | 'C1' | 'C2';

export const DAY = 86_400_000;
/** "Demo today" at 10:00 UTC, so seeded data never looks stale. */
export function demoToday(now = Date.now()): Date { const d = new Date(now); d.setUTCHours(10, 0, 0, 0); return d; }
export const relDate = (offsetDays: number, now = Date.now()) => new Date(demoToday(now).getTime() + offsetDays * DAY).toISOString().slice(0, 10);

/** Resolve "T-22" date tokens inside a seeded extraction. */
export function resolveDates<T>(obj: T, now = Date.now()): T {
  return JSON.parse(JSON.stringify(obj), (_k, v) => (typeof v === 'string' && /^T-\d+$/.test(v) ? relDate(-Number(v.slice(2)), now) : v));
}

export interface SampleTrade {
  key: SampleKey; label: string; scenario: ScenarioId; smeId: string; buyerId: string; goods: string; hsCode: string;
  value: number; currency: string; incoterm: string; paymentTermsDays: number; invoiceNo: string;
  docs: Record<DocType, ExtractedFields>; fileNames: Record<DocType, string>; amendedInvoice?: ExtractedFields;
}

const files = (p: string) => ({ po: `${p}-purchase-order.pdf`, invoice: `${p}-commercial-invoice.pdf`, packing: `${p}-packing-list.pdf`, shippingBill: `${p}-shipping-bill.pdf`, bl: `${p}-bill-of-lading.pdf` });
const D = (x: unknown) => x as ExtractedFields;

export const SAMPLES: Record<SampleKey, SampleTrade> = {
  A: { key: 'A', label: 'Scenario A: clean trade', scenario: 'A', smeId: 'org_kaveri', buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts, crew neck', hsCode: '610910',
    value: 18750, currency: 'USD', incoterm: 'FOB', paymentTermsDays: 90, invoiceNo: 'KT/2627/0198',
    docs: { po: D(Apo), invoice: D(Ainv), packing: D(Apack), shippingBill: D(Asb), bl: D(Abl) }, fileNames: files('A') },
  B: { key: 'B', label: 'Scenario B: inconsistent trade', scenario: 'B', smeId: 'org_kaveri', buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts, assorted colours', hsCode: '610910',
    value: 30000, currency: 'USD', incoterm: 'FOB', paymentTermsDays: 90, invoiceNo: 'KT/2627/0231',
    docs: { po: D(Bpo), invoice: D(Binv), packing: D(Bpack), shippingBill: D(Bsb), bl: D(Bbl) }, fileNames: files('B'), amendedInvoice: D(BinvAm) },
  C1: { key: 'C1', label: 'Scenario C: exact copy', scenario: 'C', smeId: 'org_cks', buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts, organic', hsCode: '610910',
    value: 18400, currency: 'USD', incoterm: 'FOB', paymentTermsDays: 90, invoiceNo: 'CKS/2627/0188',
    docs: { po: D(C1po), invoice: D(C1inv), packing: D(C1pack), shippingBill: D(C1sb), bl: D(C1bl) }, fileNames: files('C') },
  C2: { key: 'C2', label: 'Scenario C: altered copy', scenario: 'C', smeId: 'org_cks', buyerId: 'buyer_hartwell', goods: 'Cotton knit T-shirts, organic', hsCode: '610910',
    value: 18900, currency: 'USD', incoterm: 'FOB', paymentTermsDays: 90, invoiceNo: 'CKS/2627/0188-A',
    docs: { po: D(C2po), invoice: D(C2inv), packing: D(C2pack), shippingBill: D(C2sb), bl: D(C2bl) }, fileNames: files('C2') },
};

/** Staged external-source results, per exporter (checks 7, 8, 12, 14 are computed elsewhere). */
const kaveriStaged: StagedTable = {
  1: { result: 'pass', line: 'MCA: active, incorporated 2016. Udyam registered.', evidence: { source: 'MCA21 (simulated)', cin: 'U17111TZ2016PTC0XXXXX', status: 'Active', incorporated: '2016-03-14', udyam: 'UDYAM-TN-31-0045121', udyamCategory: 'Small' } },
  2: { result: 'pass', line: 'IEC active, no restrictions.', evidence: { source: 'DGFT (simulated)', iec: '0416011234', status: 'Active', denyEntityList: false } },
  3: { result: 'pass', line: 'Promoter PAN matches name (consented KYC).', evidence: { source: 'KYC (simulated)', panMasked: 'AXXPXXXX1K', nameMatch: 'exact', consentRef: 'kyc-consent-0192' } },
  4: { result: 'pass', line: 'GSTIN active, last 12 returns filed (11 on time).', evidence: { source: 'GST (simulated)', gstin: '33AAAAK0000A1Z5', status: 'Active', returnsFiled: 12, onTime: 11 } },
  5: { result: 'pass', line: 'e-Invoice IRN found, signed QR valid.', evidence: { source: 'e-Invoice IRP (simulated)', irnStatus: 'ACT', signedQr: 'valid' } },
  6: { result: 'pass', line: 'Shipping Bill and Bill of Lading both present.', evidence: { source: 'ICEGATE (simulated)', shippingBillStatus: 'LEO granted', egm: 'filed' } },
  7: { result: 'unknown', line: 'Carrier tracking not yet available. Forwarder confirmation requested.', evidence: { source: 'Carrier API (simulated)', carrierStatus: null, forwarderRequestSent: true } },
  9: { result: 'pass', line: 'Buyer registered, 8 years of filings, rating B+. No platform payment history yet.', evidence: { source: 'UK company registry (simulated)', registrationId: 'GB-CH-09811234', status: 'Active', yearsOfFilings: 8, rating: 'B+', platformHistory: 0 } },
  10: { result: 'pass', line: 'No matches on 3 screening lists.', evidence: { source: 'Sanctions screening (simulated)', lists: ['UN Consolidated', 'OFAC SDN', 'UK HMT'], matches: 0 } },
  11: { result: 'pass', line: 'No name, address, director or bank overlap.', evidence: { source: 'Corporate graph (simulated)', compared: ['names', 'addresses', 'directors', 'bank accounts'], overlaps: 0 } },
  13: { result: 'pass', line: 'Penny-drop name match: KAVERI TEXTILES PVT LTD.', evidence: { source: 'Bank penny drop (simulated)', accountMasked: 'XXXXXX4417', ifsc: 'HDFC000XXXX', beneficiaryName: 'KAVERI TEXTILES PVT LTD', nameMatch: 'exact' } },
};
const cksStaged: StagedTable = {
  ...kaveriStaged,
  1: { result: 'pass', line: 'MCA: active LLP, incorporated 2019. Udyam registered.', evidence: { source: 'MCA21 (simulated)', llpin: 'AAX-0000', status: 'Active', incorporated: '2019-07-02', udyam: 'UDYAM-TN-03-0099817' } },
  2: { result: 'pass', line: 'IEC active, no restrictions.', evidence: { source: 'DGFT (simulated)', iec: '0419088812', status: 'Active' } },
  3: { result: 'pass', line: 'Designated partner PAN matches name (consented KYC).', evidence: { source: 'KYC (simulated)', panMasked: 'BXXPXXXX7C', nameMatch: 'exact' } },
  4: { result: 'pass', line: 'GSTIN active, last 12 returns filed (12 on time).', evidence: { source: 'GST (simulated)', gstin: '33AAAAC0000B1Z2', status: 'Active', returnsFiled: 12, onTime: 12 } },
  9: { result: 'pass', line: 'Buyer registered, 11 years of filings, rating B. 2 settled trades on platform.', evidence: { source: 'UK company registry (simulated)', registrationId: 'GB-CH-07720456', yearsOfFilings: 11, rating: 'B' } },
  13: { result: 'pass', line: 'Penny-drop name match: COIMBATORE KNIT STUDIO LLP.', evidence: { source: 'Bank penny drop (simulated)', accountMasked: 'XXXXXX9021', beneficiaryName: 'COIMBATORE KNIT STUDIO LLP', nameMatch: 'exact' } },
};
export const STAGED_BY_ORG: Record<string, StagedTable> = { org_kaveri: kaveriStaged, org_cks: cksStaged };

/** Seeded history: completed trades (Passport) and registry entries. */
export interface HistoricalTrade { id: string; smeId: string; buyerId: string; invoiceNo: string; usd: number; daysAgo: number; lenderId: string; settled: boolean; irn?: string; }
export const HISTORY: HistoricalTrade[] = [
  { id: 'TRD-2526-0142', smeId: 'org_kaveri', buyerId: 'buyer_lindqvist', invoiceNo: 'KT/2526/0142', usd: 12000, daysAgo: 300, lenderId: 'lender_banyan', settled: true },
  { id: 'TRD-2526-0177', smeId: 'org_kaveri', buyerId: 'buyer_northgate', invoiceNo: 'KT/2526/0177', usd: 18000, daysAgo: 210, lenderId: 'lender_meridian', settled: true },
  { id: 'TRD-2627-0061', smeId: 'org_kaveri', buyerId: 'buyer_porto', invoiceNo: 'KT/2627/0061', usd: 22000, daysAgo: 140, lenderId: 'lender_banyan', settled: true },
  { id: 'TRD-2526-0390', smeId: 'org_cks', buyerId: 'buyer_hartwell', invoiceNo: 'CKS/2526/0390', usd: 14200, daysAgo: 260, lenderId: 'lender_tidewater', settled: true },
  { id: 'TRD-2627-0044', smeId: 'org_cks', buyerId: 'buyer_hartwell', invoiceNo: 'CKS/2627/0044', usd: 16800, daysAgo: 150, lenderId: 'lender_banyan', settled: true },
  // The invoice Scenario C tries to re-finance: Banyan financed it on 14 Sep (50 days before demo today).
  { id: 'TRD-2627-0188', smeId: 'org_cks', buyerId: 'buyer_hartwell', invoiceNo: 'CKS/2627/0188', usd: 18400, daysAgo: 50, lenderId: 'lender_banyan', settled: false, irn: '9c2d4e6f8a0b1c3d5e7f9a1b2c4d6e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c90' },
];
/** Other platform members' entries (supplier/buyer ids are opaque). */
export const OTHER_REGISTRY: { supplier: string; buyer: string; invoiceNo: string; usd: number; daysAgo: number; lenderId: string; settled: boolean }[] = [
  { supplier: '27AAAAM0000C1Z9', buyer: 'DE-HRB-88112', invoiceNo: 'MLW/2627/0012', usd: 40500, daysAgo: 96, lenderId: 'lender_meridian', settled: false },
  { supplier: '24AAAAG0000D1Z4', buyer: 'GB-CH-05544321', invoiceNo: 'GJT/2627/0207', usd: 27300, daysAgo: 33, lenderId: 'lender_tidewater', settled: false },
];

export const SCENARIO_EXPORTER: Record<ScenarioId, string> = { A: 'org_kaveri', B: 'org_kaveri', C: 'org_cks' };
export const SCENARIO_SAMPLE: Record<ScenarioId, SampleKey> = { A: 'A', B: 'B', C: 'C1' };
