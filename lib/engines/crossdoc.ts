// Cross-document matcher (Blueprint 11.3). REAL: pure comparison over extracted fields.
import type { DocType, ExtractedFields } from '../types';
import { DOC_LABELS } from '../types';

export interface Finding {
  field: string;
  docs: string[];
  values: Record<string, unknown>;
  severity: 'mismatch' | 'note';
  message: string;
}
export interface CompareRow { field: string; values: Partial<Record<DocType, string | number | null>>; status: 'ok' | 'mismatch' | 'note'; }
export interface CrossDocResult { findings: Finding[]; table: CompareRow[]; pass: boolean; headline: string; interpretation?: string; }

type DocSet = Partial<Record<DocType, ExtractedFields>>;

const n = (x: number) => x.toLocaleString('en-US');
const get = (d: ExtractedFields | undefined, k: string) => d?.fields[k]?.value;
const num = (d: ExtractedFields | undefined, k: string) => {
  const v = get(d, k);
  return v === undefined || v === null || v === '' ? undefined : Number(v);
};

/** Normalise company names: lowercase, strip punctuation, expand Ltd/Pvt/LLP, compare token sets. */
export function normaliseName(name: string): string[] {
  const expand: Record<string, string[]> = {
    ltd: ['limited'], pvt: ['private'], llp: ['limited', 'liability', 'partnership'], co: ['company'], inc: ['incorporated'],
  };
  const tokens = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (const t of tokens) for (const e of expand[t] ?? [t]) out.add(e);
  return [...out].sort();
}
export const namesMatch = (a: string, b: string) => normaliseName(a).join(' ') === normaliseName(b).join(' ');

const daysBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;

export function crossCheck(docs: DocSet): CrossDocResult {
  const findings: Finding[] = [];
  const table: CompareRow[] = [];
  const { po, invoice, packing, shippingBill: sb, bl } = docs;

  // ---- Quantity: Invoice, Packing List, Shipping Bill must equal the BL (the shipped evidence).
  const q: Partial<Record<DocType, number | undefined>> = {
    po: num(po, 'quantity'), invoice: num(invoice, 'quantity'), packing: num(packing, 'quantity'),
    shippingBill: num(sb, 'quantity'), bl: num(bl, 'quantity'),
  };
  let qtyStatus: CompareRow['status'] = 'ok';
  const blQty = q.bl;
  if (blQty !== undefined) {
    const agreeing: DocType[] = [];
    for (const t of ['invoice', 'packing', 'shippingBill'] as DocType[]) {
      const v = q[t];
      if (v === undefined) continue;
      if (v !== blQty) {
        qtyStatus = 'mismatch';
        findings.push({
          field: 'quantity', docs: [t, 'bl'], values: { [t]: v, bl: blQty }, severity: 'mismatch',
          message: `${t === 'invoice' ? 'Invoice' : DOC_LABELS[t]} quantity ${n(v)} does not match Bill of Lading quantity ${n(blQty)}.`,
        });
      } else agreeing.push(t);
    }
    if (qtyStatus === 'mismatch' && agreeing.length) {
      findings.push({
        field: 'quantity', docs: [...agreeing, 'bl'], values: Object.fromEntries(agreeing.map((t) => [t, q[t]])), severity: 'note',
        message: `${agreeing.map((t) => DOC_LABELS[t]).join(' and ')} agree${agreeing.length === 1 ? 's' : ''} with the Bill of Lading (${n(blQty)}).`,
      });
    }
    // PO may be higher if partial shipments are permitted.
    if (q.po !== undefined) {
      const partialOk = get(po, 'partialShipmentsPermitted') === true;
      if (q.po < blQty || (q.invoice !== undefined && q.po < q.invoice)) {
        findings.push({ field: 'quantity', docs: ['po', 'bl'], values: { po: q.po, bl: blQty }, severity: 'mismatch',
          message: `Shipped quantity ${n(blQty)} exceeds Purchase Order quantity ${n(q.po)}.` });
        qtyStatus = 'mismatch';
      } else if (q.po > blQty) {
        if (partialOk) {
          findings.push({ field: 'quantity', docs: ['po', 'bl'], values: { po: q.po, bl: blQty }, severity: 'note',
            message: `Partial shipment, permitted by PO (${n(blQty)} of ${n(q.po)} pcs).` });
          if (qtyStatus === 'ok') qtyStatus = 'note';
        } else {
          findings.push({ field: 'quantity', docs: ['po', 'bl'], values: { po: q.po, bl: blQty }, severity: 'mismatch',
            message: `Bill of Lading quantity ${n(blQty)} is below PO quantity ${n(q.po)} and the PO does not permit partial shipment.` });
          qtyStatus = 'mismatch';
        }
      }
    }
  }
  table.push({ field: 'Quantity (pcs)', values: q as CompareRow['values'], status: qtyStatus });

  // ---- Amount: invoice = qty × unit price; Shipping Bill FOB = invoice amount within 0.5%.
  const invAmt = num(invoice, 'amount');
  const invQty = q.invoice;
  const unit = num(invoice, 'unitPrice');
  let amtStatus: CompareRow['status'] = 'ok';
  if (invAmt !== undefined && invQty !== undefined && unit !== undefined && Math.abs(invQty * unit - invAmt) > 0.005) {
    amtStatus = 'mismatch';
    findings.push({ field: 'amount', docs: ['invoice'], values: { quantity: invQty, unitPrice: unit, amount: invAmt }, severity: 'mismatch',
      message: `Invoice amount ${n(invAmt)} does not equal quantity × unit price (${n(invQty * unit)}).` });
  }
  const fob = num(sb, 'fobValue');
  if (fob !== undefined && invAmt !== undefined && Math.abs(fob - invAmt) / invAmt > 0.005) {
    amtStatus = 'mismatch';
    findings.push({ field: 'amount', docs: ['shippingBill', 'invoice'], values: { shippingBill: fob, invoice: invAmt }, severity: 'mismatch',
      message: `Shipping Bill FOB value USD ${n(fob)} does not match invoice amount USD ${n(invAmt)}.` });
  }
  table.push({ field: 'Value (USD)', values: { po: num(po, 'amount') ?? null, invoice: invAmt ?? null, shippingBill: fob ?? null }, status: amtStatus });

  // ---- Dates: PO ≤ Invoice ≤ BL; Shipping Bill within 7 days of BL.
  const dPo = get(po, 'poDate') as string | undefined, dInv = get(invoice, 'invoiceDate') as string | undefined;
  const dBl = get(bl, 'blDate') as string | undefined, dSb = get(sb, 'sbDate') as string | undefined;
  let dateStatus: CompareRow['status'] = 'ok';
  if (dPo && dInv && daysBetween(dPo, dInv) < 0) { dateStatus = 'mismatch'; findings.push({ field: 'date', docs: ['po', 'invoice'], values: { po: dPo, invoice: dInv }, severity: 'mismatch', message: `Invoice is dated before the Purchase Order.` }); }
  if (dInv && dBl && daysBetween(dInv, dBl) < 0) { dateStatus = 'mismatch'; findings.push({ field: 'date', docs: ['invoice', 'bl'], values: { invoice: dInv, bl: dBl }, severity: 'mismatch', message: `Invoice is dated after the Bill of Lading.` }); }
  if (dSb && dBl && Math.abs(daysBetween(dSb, dBl)) > 7) { dateStatus = 'mismatch'; findings.push({ field: 'date', docs: ['shippingBill', 'bl'], values: { shippingBill: dSb, bl: dBl }, severity: 'mismatch', message: `Shipping Bill date is more than 7 days from the Bill of Lading date.` }); }
  table.push({ field: 'Date', values: { po: dPo ?? null, invoice: dInv ?? null, packing: (get(packing, 'date') as string) ?? null, shippingBill: dSb ?? null, bl: dBl ?? null }, status: dateStatus });

  // ---- Parties: buyer/consignee names equal after normalising.
  const buyerNames: Partial<Record<DocType, string>> = {
    po: get(po, 'buyer') as string, invoice: get(invoice, 'buyer') as string, packing: get(packing, 'buyer') as string,
    shippingBill: get(sb, 'consignee') as string, bl: get(bl, 'consignee') as string,
  };
  const sellerNames: Partial<Record<DocType, string>> = {
    po: get(po, 'seller') as string, invoice: get(invoice, 'seller') as string, packing: get(packing, 'seller') as string,
    shippingBill: get(sb, 'exporter') as string, bl: get(bl, 'shipper') as string,
  };
  for (const [label, names] of [['Buyer', buyerNames], ['Seller', sellerNames]] as const) {
    const entries = Object.entries(names).filter(([, v]) => v) as [DocType, string][];
    let status: CompareRow['status'] = 'ok';
    if (entries.length > 1) {
      const ref = entries.find(([t]) => t === 'invoice') ?? entries[0];
      const rawDiff = entries.filter(([, v]) => v !== ref[1]);
      const realDiff = rawDiff.filter(([, v]) => !namesMatch(v, ref[1]));
      for (const [t, v] of realDiff) {
        status = 'mismatch';
        findings.push({ field: label.toLowerCase(), docs: [ref[0], t], values: { [ref[0]]: ref[1], [t]: v }, severity: 'mismatch',
          message: `${label} name "${v}" on the ${DOC_LABELS[t]} does not match "${ref[1]}" on the ${DOC_LABELS[ref[0]]}.` });
      }
      if (!realDiff.length && rawDiff.length) {
        status = 'note';
        const t = rawDiff[0][0];
        findings.push({ field: label.toLowerCase(), docs: [ref[0], t], values: { [ref[0]]: ref[1], [t]: rawDiff[0][1] }, severity: 'note',
          message: `${label} names matched after normalising ("${ref[1]}" and "${rawDiff[0][1]}").` });
      }
    }
    table.push({ field: label, values: names, status });
  }

  // ---- HS code: first 6 digits.
  const hs: Partial<Record<DocType, string>> = {
    po: get(po, 'hsCode') as string, invoice: get(invoice, 'hsCode') as string, packing: get(packing, 'hsCode') as string,
    shippingBill: get(sb, 'hsCode') as string,
  };
  const hs6 = Object.entries(hs).filter(([, v]) => v).map(([t, v]) => [t, String(v).replace(/\D/g, '').slice(0, 6)] as const);
  let hsStatus: CompareRow['status'] = 'ok';
  if (new Set(hs6.map(([, v]) => v)).size > 1) {
    hsStatus = 'mismatch';
    findings.push({ field: 'hsCode', docs: hs6.map(([t]) => t), values: Object.fromEntries(hs6), severity: 'mismatch', message: `HS codes do not agree on the first 6 digits.` });
  }
  table.push({ field: 'HS code', values: hs, status: hsStatus });

  // ---- Ports (UN/LOCODE).
  for (const [key, label] of [['portLoading', 'Port of loading'], ['portDischarge', 'Port of discharge']] as const) {
    const vals: Partial<Record<DocType, string>> = {};
    for (const t of ['po', 'invoice', 'shippingBill', 'bl'] as DocType[]) { const v = get(docs[t], key); if (v) vals[t] = String(v).toUpperCase(); }
    let status: CompareRow['status'] = 'ok';
    if (new Set(Object.values(vals)).size > 1) {
      status = 'mismatch';
      findings.push({ field: key, docs: Object.keys(vals), values: vals, severity: 'mismatch', message: `${label} differs across documents.` });
    }
    table.push({ field: label, values: vals, status });
  }

  // ---- Currency and Incoterm: exact.
  for (const [key, label] of [['incoterm', 'Incoterm'], ['currency', 'Currency']] as const) {
    const vals: Partial<Record<DocType, string>> = {};
    for (const t of ['po', 'invoice', 'shippingBill'] as DocType[]) {
      const d = docs[t];
      const v = key === 'currency' ? (d?.fields.amount?.currency ?? d?.fields.fobValue?.currency) : get(d, key);
      if (v) vals[t] = String(v);
    }
    let status: CompareRow['status'] = 'ok';
    if (new Set(Object.values(vals)).size > 1) {
      status = 'mismatch';
      findings.push({ field: key, docs: Object.keys(vals), values: vals, severity: 'mismatch', message: `${label} differs across documents.` });
    }
    table.push({ field: label, values: vals, status });
  }

  const mismatches = findings.filter((f) => f.severity === 'mismatch');
  const pass = mismatches.length === 0;
  let interpretation: string | undefined;
  if (q.invoice !== undefined && blQty !== undefined && q.invoice > blQty && unit !== undefined) {
    const gap = q.invoice - blQty;
    interpretation = `${n(gap)} pcs were not shipped. The invoice may overstate the goods by USD ${n(gap * unit)}.`;
  }
  const docCount = Object.values(docs).filter(Boolean).length;
  const headline = pass
    ? `All ${docCount} documents agree on quantity, value, dates, parties, HS code and ports.`
    : mismatches[0].message;
  return { findings, table, pass, headline, interpretation };
}
