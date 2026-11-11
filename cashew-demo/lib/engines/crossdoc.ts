// Cross-document matcher (Blueprint Section 11.3). Pure and REAL: check 8 runs on this.
import type { DocType, ExtractedFields } from '@/lib/types';

export interface Finding {
  field: string;
  docs: string[];
  values: Record<string, unknown>;
  severity: 'mismatch' | 'note';
  message: string;
}

export interface ComparisonRow {
  doc: DocType;
  name: string;
  quantity?: number;
  amount?: number;
  buyer?: string;
  mismatched: string[];
}

export interface CrossDocResult {
  findings: Finding[];
  mismatches: Finding[];
  notes: Finding[];
  passed: boolean;
  headline: string;
  table: ComparisonRow[];
}

export const DOC_NAMES: Record<DocType, string> = {
  po: 'Purchase Order',
  invoice: 'Commercial Invoice',
  packing: 'Packing List',
  shippingBill: 'Shipping Bill',
  bl: 'Bill of Lading',
};
const SHORT: Record<DocType, string> = { po: 'PO', invoice: 'Invoice', packing: 'Packing List', shippingBill: 'Shipping Bill', bl: 'Bill of Lading' };
const ORDER: DocType[] = ['po', 'invoice', 'packing', 'shippingBill', 'bl'];
const DAY = 86_400_000;

export type DocFields = Partial<Record<DocType, ExtractedFields>>;

const WORDS: Record<string, string[]> = { ltd: ['limited'], pvt: ['private'], llp: ['limited', 'liability', 'partnership'] };

export function normaliseName(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => WORDS[token] ?? [token]);
  return Array.from(new Set(tokens)).sort();
}

const sameName = (a: string, b: string) => normaliseName(a).join(' ') === normaliseName(b).join(' ');
const num = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const present = (docs: DocFields) => ORDER.filter((type) => docs[type]);

export function compareDocuments(docs: DocFields): CrossDocResult {
  const findings: Finding[] = [];
  const mismatch = (field: string, list: string[], values: Record<string, unknown>, message: string) => findings.push({ field, docs: list, values, severity: 'mismatch', message });
  const note = (field: string, list: string[], values: Record<string, unknown>, message: string) => findings.push({ field, docs: list, values, severity: 'note', message });
  const get = (type: DocType, field: string) => docs[type]?.[field]?.value;
  const unit = (type: DocType, field: string) => docs[type]?.[field]?.currency;
  const types = present(docs);

  // Quantity: exact across shipped-goods documents. Bill of Lading first, as the most independent one.
  const qty = (type: DocType) => get(type, 'quantity') as number | undefined;
  const invoiceQty = qty('invoice');
  const quantities = Object.fromEntries(types.map((t) => [t, qty(t)]));
  if (invoiceQty !== undefined) {
    for (const other of ['bl', 'packing', 'shippingBill'] as DocType[]) {
      const otherQty = qty(other);
      if (otherQty !== undefined && otherQty !== invoiceQty) {
        mismatch('quantity', ['invoice', other], quantities, `Invoice quantity ${num(invoiceQty)} does not match ${SHORT[other]} quantity ${num(otherQty)}.`);
      }
    }
    const blQty = qty('bl');
    if (blQty !== undefined && blQty !== invoiceQty) {
      const agreeing = (['packing', 'shippingBill'] as DocType[]).filter((t) => qty(t) === blQty);
      if (agreeing.length > 0) note('quantity', [...agreeing, 'bl'], quantities, `${agreeing.map((t) => SHORT[t]).join(' and ')} agree with the Bill of Lading.`);
      const price = get('invoice', 'unitPrice') as number | undefined;
      if (price && invoiceQty > blQty) {
        note('quantity', ['invoice', 'bl'], quantities, `${num(invoiceQty - blQty)} pcs were not shipped. The invoice may overstate the goods by ${unit('invoice', 'unitPrice') ?? 'USD'} ${num((invoiceQty - blQty) * price)}.`);
      }
    }
    const poQty = qty('po');
    if (poQty !== undefined && poQty !== invoiceQty) {
      if (poQty > invoiceQty && get('po', 'partialShipmentsPermitted') === true) {
        note('quantity', ['po', 'invoice'], quantities, 'Partial shipment, permitted by the PO.');
      } else {
        mismatch('quantity', ['po', 'invoice'], quantities, `PO quantity ${num(poQty)} does not match Invoice quantity ${num(invoiceQty)}.`);
      }
    }
  }

  // Amount.
  const amount = get('invoice', 'amount') as number | undefined;
  const price = get('invoice', 'unitPrice') as number | undefined;
  if (amount !== undefined && price !== undefined && invoiceQty !== undefined && Math.abs(amount - invoiceQty * price) > 0.01) {
    mismatch('amount', ['invoice'], { amount, computed: invoiceQty * price }, `Invoice amount ${num(amount)} does not equal quantity × unit price (${num(invoiceQty * price)}).`);
  }
  const fob = get('shippingBill', 'amount') as number | undefined;
  if (amount !== undefined && fob !== undefined && Math.abs(fob - amount) / amount > 0.005) {
    mismatch('amount', ['shippingBill', 'invoice'], { shippingBill: fob, invoice: amount }, `Shipping Bill FOB value ${num(fob)} does not match invoice amount ${num(amount)}.`);
  }

  // Dates.
  const day = (type: DocType, field: string) => {
    const value = get(type, field);
    return typeof value === 'string' ? Date.parse(value) : undefined;
  };
  const po = day('po', 'poDate');
  const inv = day('invoice', 'invoiceDate');
  const bl = day('bl', 'blDate');
  const sb = day('shippingBill', 'sbDate');
  if (po !== undefined && inv !== undefined && po > inv) mismatch('date', ['po', 'invoice'], { po: get('po', 'poDate'), invoice: get('invoice', 'invoiceDate') }, 'The PO is dated after the invoice.');
  if (inv !== undefined && bl !== undefined && inv > bl) mismatch('date', ['invoice', 'bl'], { invoice: get('invoice', 'invoiceDate'), bl: get('bl', 'blDate') }, 'The invoice is dated after the Bill of Lading.');
  if (sb !== undefined && bl !== undefined && Math.abs(sb - bl) > 7 * DAY) mismatch('date', ['shippingBill', 'bl'], { shippingBill: get('shippingBill', 'sbDate'), bl: get('bl', 'blDate') }, 'The Shipping Bill and Bill of Lading are more than 7 days apart.');

  // Parties: compared after normalising, and a difference that disappears is only a note.
  for (const field of ['buyer', 'seller']) {
    const names = types.map((t) => [t, get(t, field)] as const).filter((pair): pair is [DocType, string] => typeof pair[1] === 'string');
    if (names.length < 2) continue;
    const values = Object.fromEntries(names);
    if (names.some(([, name]) => !sameName(name, names[0][1]))) {
      const other = names.find(([, name]) => !sameName(name, names[0][1]))!;
      mismatch(field, [names[0][0], other[0]], values, `${field === 'buyer' ? 'Buyer' : 'Seller'} name "${names[0][1]}" does not match "${other[1]}".`);
    } else if (new Set(names.map(([, name]) => name)).size > 1) {
      note(field, names.map(([t]) => t), values, `${field === 'buyer' ? 'Buyer' : 'Seller'} names matched after normalising.`);
    }
  }

  // Exact fields. HS codes compare on the first 6 digits.
  const exact = (field: string, label: string, read: (t: DocType) => unknown) => {
    const rows = types.map((t) => [t, read(t)] as const).filter(([, v]) => v !== undefined);
    if (rows.length > 1 && new Set(rows.map(([, v]) => v)).size > 1) {
      const other = rows.find(([, v]) => v !== rows[0][1])!;
      mismatch(field, [rows[0][0], other[0]], Object.fromEntries(rows), `${label} on the ${SHORT[rows[0][0]]} does not match the ${SHORT[other[0]]}.`);
    }
  };
  exact('hsCode', 'HS code', (t) => String(get(t, 'hsCode') ?? '').slice(0, 6) || undefined);
  exact('portLoading', 'Port of loading', (t) => get(t, 'portLoading'));
  exact('portDischarge', 'Port of discharge', (t) => get(t, 'portDischarge'));
  exact('currency', 'Currency', (t) => unit(t, 'amount'));
  exact('incoterm', 'Incoterm', (t) => get(t, 'incoterm'));

  const mismatches = findings.filter((f) => f.severity === 'mismatch');
  const notes = findings.filter((f) => f.severity === 'note');
  const flagged = (type: DocType, field: string) => mismatches.some((m) => m.field === field && m.docs.includes(type));
  const table: ComparisonRow[] = types.map((type) => ({
    doc: type,
    name: DOC_NAMES[type],
    quantity: qty(type),
    amount: get(type, 'amount') as number | undefined,
    buyer: get(type, 'buyer') as string | undefined,
    mismatched: ['quantity', 'amount', 'buyer'].filter((field) => flagged(type, field)),
  }));

  return {
    findings,
    mismatches,
    notes,
    passed: mismatches.length === 0,
    headline: mismatches[0]?.message ?? `All ${types.length} documents agree.`,
    table,
  };
}
