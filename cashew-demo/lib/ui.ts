// Display helpers shared by the screens.
import type { StatusKind } from '@/components/status';
import type { TradeStatus } from '@/lib/types';

export const STATUS_DISPLAY: Record<TradeStatus, { label: string; kind: StatusKind }> = {
  DRAFT: { label: 'Draft', kind: 'pending' },
  SUBMITTED: { label: 'Submitted', kind: 'pending' },
  VERIFYING: { label: 'Verifying', kind: 'running' },
  NEEDS_INFO: { label: 'Needs attention', kind: 'warn' },
  VERIFIED: { label: 'Verified', kind: 'pass' },
  OFFERS_OPEN: { label: 'Offers open', kind: 'info' },
  OFFER_ACCEPTED: { label: 'Offer accepted', kind: 'info' },
  CONTRACT_SIGNED: { label: 'Contract signed', kind: 'info' },
  FINANCED: { label: 'Financed', kind: 'pass' },
  SHIPMENT_IN_TRANSIT: { label: 'In transit', kind: 'pass' },
  DELIVERED: { label: 'Delivered', kind: 'pass' },
  BUYER_ACCEPTED: { label: 'Buyer accepted', kind: 'pass' },
  REPAID: { label: 'Repaid', kind: 'pass' },
  CLOSED: { label: 'Closed', kind: 'pass' },
  REJECTED_VERIFICATION: { label: 'Blocked', kind: 'fail' },
  WITHDRAWN: { label: 'Withdrawn', kind: 'unknown' },
  DISPUTED: { label: 'Disputed', kind: 'warn' },
  DEFAULTED: { label: 'Defaulted', kind: 'fail' },
};

const MILESTONES = ['Submitted', 'Verified', 'Offers', 'Financed', 'Shipped', 'Delivered', 'Repaid'];
const REACHED: Partial<Record<TradeStatus, number>> = {
  SUBMITTED: 0, VERIFYING: 0, NEEDS_INFO: 0, REJECTED_VERIFICATION: 0, VERIFIED: 1, OFFERS_OPEN: 2, OFFER_ACCEPTED: 2, CONTRACT_SIGNED: 2,
  FINANCED: 3, SHIPMENT_IN_TRANSIT: 4, DELIVERED: 5, BUYER_ACCEPTED: 5, REPAID: 6, CLOSED: 6,
};

export function tradeMilestones(status: TradeStatus) {
  const reached = REACHED[status] ?? -1;
  const stopped = status === 'REJECTED_VERIFICATION' || status === 'WITHDRAWN';
  return MILESTONES.map((title, i) => ({
    title,
    state: i <= reached ? ('done' as const) : i === reached + 1 && !stopped ? ('current' as const) : ('upcoming' as const),
  }));
}

export const formatDate = (iso?: string) => (iso ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso)) : '—');
export const formatDateTime = (iso?: string) => (iso ? `${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date(iso))} IST` : '—');

export const DOC_LABEL: Record<string, string> = { po: 'Purchase Order', invoice: 'Commercial Invoice', packing: 'Packing List', shippingBill: 'Shipping Bill', bl: 'Bill of Lading' };

export const FIELD_LABEL: Record<string, string> = {
  poNo: 'PO no.', poDate: 'PO date', invoiceNo: 'Invoice no.', invoiceDate: 'Invoice date', packingNo: 'Packing list no.', date: 'Date', sbNo: 'Shipping Bill no.', sbDate: 'Shipping Bill date',
  blNo: 'BL no.', blDate: 'BL date', seller: 'Seller', buyer: 'Buyer', hsCode: 'HS code', quantity: 'Quantity', unitPrice: 'Unit price', amount: 'Amount', incoterm: 'Incoterm',
  portLoading: 'Port of loading', portDischarge: 'Port of discharge', irn: 'e-Invoice IRN', partialShipmentsPermitted: 'Partial shipments permitted',
};

export function fieldValue(field: { value: string | number | boolean; unit?: string; currency?: string }) {
  if (typeof field.value === 'boolean') return field.value ? 'Yes' : 'No';
  const text = typeof field.value === 'number' ? new Intl.NumberFormat('en-IN').format(field.value) : field.value;
  return [field.currency, text, field.unit].filter(Boolean).join(' ');
}
