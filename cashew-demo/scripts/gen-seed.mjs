// One-off generator for the fictional sample documents: extracted-field JSON and decorative PDFs.
// Run with `node scripts/gen-seed.mjs`. Its output is committed, so the demo never runs this.
import { mkdirSync, writeFileSync } from 'node:fs';

const KAVERI = 'Kaveri Textiles Pvt Ltd';
const CKS = 'Coimbatore Knit Studio LLP';
const IRN_B = '4f1c9a7e2b6d80f35ac17e94d2036b8ef1a5c07d9e42b6130cd8f75ea1b94c26';
const IRN_A = 'a83d20f7c15e96b4072fd8e13ca6490be57f1d28c3096ea4b17d52f80c6e39a1';
const IRN_C = 'd6027be49c31f8a5e04d71c96b28f3a07e5c19d4b86a230f7c1ee95d3048ba72';

const f = (value, confidence = 0.97, extra = {}) => ({ value, confidence, ...extra });
const usd = (value, c = 0.98) => f(value, c, { currency: 'USD' });
const pcs = (value, c = 0.98) => f(value, c, { unit: 'pcs' });

function set({ key, seller, buyer, buyerUpper, sellerUpper, inv, invDate, poNo, poDate, poQty, poAmount, qty, sbQty = qty, blQty = qty, packQty = qty, fob, sbDate, blDate, blNo, sbNo, irn, reviewPort = false }) {
  const trade = { hsCode: f('610910', 0.96), incoterm: f('FOB', 0.93), portLoading: f('INTUT', 0.9), portDischarge: f('GBFXT', 0.9) };
  return {
    po: { docType: 'po', fields: { poNo: f(poNo), poDate: f(poDate), seller: f(seller, 0.99), buyer: f(buyer, 0.96), hsCode: trade.hsCode, quantity: pcs(poQty), unitPrice: usd(6.25), amount: usd(poAmount), incoterm: trade.incoterm, portLoading: trade.portLoading, portDischarge: trade.portDischarge, partialShipmentsPermitted: f(true, 0.94) } },
    invoice: { docType: 'invoice', fields: { invoiceNo: f(inv, 0.98), invoiceDate: f(invDate), seller: f(seller, 0.99), buyer: f(buyer, 0.95), hsCode: trade.hsCode, quantity: pcs(qty), unitPrice: usd(6.25), amount: usd(qty * 6.25, 0.99), incoterm: trade.incoterm, portLoading: trade.portLoading, portDischarge: trade.portDischarge, irn: f(irn, 0.97) } },
    packing: { docType: 'packing', fields: { packingNo: f(`PL-${key}-0417`), date: f(invDate), seller: f(seller, 0.98), buyer: f(buyer, 0.95), hsCode: trade.hsCode, quantity: pcs(packQty, 0.97) } },
    shippingBill: { docType: 'shippingBill', fields: { sbNo: f(sbNo, 0.95), sbDate: f(sbDate), seller: f(seller, 0.98), buyer: f(buyer, 0.94), hsCode: trade.hsCode, quantity: pcs(sbQty, 0.97), amount: usd(fob, 0.96), incoterm: trade.incoterm, portLoading: trade.portLoading, portDischarge: trade.portDischarge } },
    bl: { docType: 'bl', fields: { blNo: f(blNo, 0.93), blDate: f(blDate), seller: f(sellerUpper, 0.94), buyer: f(buyerUpper, 0.92), hsCode: f('610910', 0.9), quantity: pcs(blQty, 0.97), portLoading: f('INTUT', 0.92), portDischarge: f('GBFXT', reviewPort ? 0.82 : 0.9) } },
  };
}

const sets = {
  A: set({ key: 'A', seller: KAVERI, sellerUpper: 'KAVERI TEXTILES PRIVATE LIMITED', buyer: 'Northgate Apparel Limited', buyerUpper: 'NORTHGATE APPAREL LTD.', inv: 'KT/2627/0198', invDate: '2026-10-05', poNo: 'NGA-PO-77102', poDate: '2026-09-20', poQty: 3000, poAmount: 18750, qty: 3000, fob: 18750, sbDate: '2026-10-07', blDate: '2026-10-09', blNo: 'SEFX26100977', sbNo: 'SB-4471902', irn: IRN_A }),
  B: set({ key: 'B', seller: KAVERI, sellerUpper: 'KAVERI TEXTILES PRIVATE LIMITED', buyer: 'Northgate Apparel Limited', buyerUpper: 'NORTHGATE APPAREL LTD.', inv: 'KT/2627/0231', invDate: '2026-10-12', poNo: 'NGA-PO-77311', poDate: '2026-09-28', poQty: 4800, poAmount: 30000, qty: 4800, sbQty: 4200, blQty: 4200, packQty: 4200, fob: 26250, sbDate: '2026-10-14', blDate: '2026-10-16', blNo: 'SEFX26110418', sbNo: 'SB-4482216', irn: IRN_B, reviewPort: true }),
  C1: set({ key: 'C', seller: CKS, sellerUpper: 'COIMBATORE KNIT STUDIO LLP', buyer: 'Hartwell & Rowe Retail Ltd', buyerUpper: 'HARTWELL AND ROWE RETAIL LIMITED', inv: 'CKS/2627/0188', invDate: '2026-09-14', poNo: 'HR-PO-20418', poDate: '2026-09-01', poQty: 2944, poAmount: 18400, qty: 2944, fob: 18400, sbDate: '2026-09-16', blDate: '2026-09-18', blNo: 'SEFX26091803', sbNo: 'SB-4460155', irn: IRN_C }),
  C2: set({ key: 'C', seller: CKS, sellerUpper: 'COIMBATORE KNIT STUDIO LLP', buyer: 'Hartwell & Rowe Retail Ltd', buyerUpper: 'HARTWELL AND ROWE RETAIL LIMITED', inv: 'CKS/2627/0188-A', invDate: '2026-09-16', poNo: 'HR-PO-20418', poDate: '2026-09-01', poQty: 3024, poAmount: 18900, qty: 3024, fob: 18900, sbDate: '2026-09-17', blDate: '2026-09-18', blNo: 'SEFX26091803', sbNo: 'SB-4460155', irn: IRN_C }),
};
const amended = JSON.parse(JSON.stringify(sets.B.invoice));
amended.fields.quantity.value = 4200;
amended.fields.amount.value = 26250;

mkdirSync('lib/seed/docs', { recursive: true });
mkdirSync('public/sample-docs', { recursive: true });
const TITLES = { po: 'Purchase Order', invoice: 'Commercial Invoice', packing: 'Packing List', shippingBill: 'Shipping Bill', bl: 'Bill of Lading' };

function pdf(title, doc) {
  const lines = [`SAMPLE DOCUMENT. FICTIONAL. NOT A REAL ${title.toUpperCase()}.`, title, ''];
  for (const [k, v] of Object.entries(doc.fields)) lines.push(`${k}: ${v.value}${v.unit ? ' ' + v.unit : ''}${v.currency ? ' ' + v.currency : ''}`);
  const esc = (s) => String(s).replace(/([()\\])/g, '\\$1');
  const stream = 'BT /F1 11 Tf 50 780 Td 16 TL\n' + lines.map((l) => `(${esc(l)}) Tj T*`).join('\n') + '\nET';
  const objs = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Kids[3 0 R]/Count 1>>', '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>', '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>', `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`];
  let out = '%PDF-1.4\n';
  const offs = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

for (const [name, docs] of Object.entries(sets)) {
  for (const [type, doc] of Object.entries(docs)) {
    writeFileSync(`lib/seed/docs/${name}-${type}.json`, JSON.stringify(doc, null, 2) + '\n');
    writeFileSync(`public/sample-docs/${name}-${type}.pdf`, pdf(TITLES[type], doc));
  }
}
writeFileSync('lib/seed/docs/B-amended.json', JSON.stringify(amended, null, 2) + '\n');
writeFileSync('public/sample-docs/B-amended.pdf', pdf('Amended Commercial Invoice', amended));
