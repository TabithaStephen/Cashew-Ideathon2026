import type { Buyer, Org } from '../types';

export const ORGS: Org[] = [
  { id: 'org_kaveri', type: 'sme', legalName: 'Kaveri Textiles Pvt Ltd', shortName: 'Kaveri Textiles', city: 'Tiruppur', gstin: '33AAAAK0000A1Z5', iec: '0416011234', udyam: 'UDYAM-TN-31-0045121', incorporated: 2016, kind: 'Cotton knit T-shirts (HS 6109)' },
  { id: 'org_cks', type: 'sme', legalName: 'Coimbatore Knit Studio LLP', shortName: 'Coimbatore Knit Studio', city: 'Coimbatore', gstin: '33AAAAC0000B1Z2', iec: '0419088812', udyam: 'UDYAM-TN-03-0099817', incorporated: 2019, kind: 'Knitwear (HS 6109)' },
  { id: 'lender_banyan', type: 'lender', legalName: 'Banyan Capital', shortName: 'Banyan Capital', kind: 'NBFC' },
  { id: 'lender_tidewater', type: 'lender', legalName: 'Tidewater Finance', shortName: 'Tidewater Finance', kind: 'Fintech lender' },
  { id: 'lender_meridian', type: 'lender', legalName: 'Meridian Bank', shortName: 'Meridian Bank', kind: 'Private bank' },
  { id: 'org_cashew', type: 'platform', legalName: 'Cashew Ops', shortName: 'Cashew Ops' },
];
export const LENDER_IDS = ['lender_banyan', 'lender_tidewater', 'lender_meridian'] as const;

export const BUYERS: Buyer[] = [
  { id: 'buyer_northgate', name: 'Northgate Apparel Ltd', country: 'GB', city: 'Manchester', registrationId: 'GB-CH-09811234', rating: 'B+', yearsOfFilings: 8 },
  { id: 'buyer_hartwell', name: 'Hartwell & Rowe Retail Ltd', country: 'GB', city: 'Leeds', registrationId: 'GB-CH-07720456', rating: 'B', yearsOfFilings: 11 },
  { id: 'buyer_lindqvist', name: 'Lindqvist Basics AB', country: 'SE', city: 'Gothenburg', registrationId: 'SE-556677-1234', rating: 'A-', yearsOfFilings: 14 },
  { id: 'buyer_porto', name: 'Porto Malhas Lda', country: 'PT', city: 'Porto', registrationId: 'PT-509876543', rating: 'BB', yearsOfFilings: 6 },
];
export const OPS_USER = { name: 'Asha', title: 'Cashew Ops' };
