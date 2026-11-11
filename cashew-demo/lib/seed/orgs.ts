// Organisations and buyers (Blueprint Section 6.1). All fictional.
import type { Buyer, Org } from '@/lib/types';

export const KAVERI = 'org_kaveri';
export const CKS = 'org_cks';
export const NORTHGATE = 'buyer_northgate';
export const HARTWELL = 'buyer_hartwell';

export const SME_ORGS: Org[] = [
  { id: KAVERI, type: 'sme', legalName: 'Kaveri Textiles Pvt Ltd', gstin: '33AAAAK0000A1Z5', iec: 'AAAAK0000A', udyam: 'UDYAM-TN-00-0000000', tier: 2, city: 'Tiruppur' },
  { id: CKS, type: 'sme', legalName: 'Coimbatore Knit Studio LLP', gstin: '33AAAAC0000B1Z7', iec: 'AAAAC0000B', udyam: 'UDYAM-TN-00-0000001', tier: 2, city: 'Coimbatore' },
];

export const BUYERS: Buyer[] = [
  { id: NORTHGATE, name: 'Northgate Apparel Ltd', country: 'GB', registrationId: 'UK-00000001' },
  { id: HARTWELL, name: 'Hartwell & Rowe Retail Ltd', country: 'GB', registrationId: 'UK-00000002' },
];

export const OPS_USER = 'Asha (Cashew Ops)';
