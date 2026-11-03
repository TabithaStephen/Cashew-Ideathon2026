// Generates the decorative sample PDFs in public/sample-docs (extraction reads seeded JSON, not these files).
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'public/sample-docs');
fs.mkdirSync(dir, { recursive: true });
const docs = path.join(process.cwd(), 'lib/seed/docs');
const TITLES = { po: 'PURCHASE ORDER', invoice: 'COMMERCIAL INVOICE', packing: 'PACKING LIST', shippingBill: 'SHIPPING BILL', bl: 'BILL OF LADING' };
const FILE = { po: 'purchase-order', invoice: 'commercial-invoice', packing: 'packing-list', shippingBill: 'shipping-bill', bl: 'bill-of-lading' };
const esc = (s) => String(s).replace(/[()\\]/g, (c) => '\\' + c);
function pdf(lines) {
  const content = ['BT /F1 18 Tf 50 790 Td (' + esc(lines[0]) + ') Tj ET', 'BT /F1 9 Tf 50 772 Td (SAMPLE DOCUMENT - FICTIONAL - CASHEW DEMO) Tj ET',
    ...lines.slice(1).map((l, i) => `BT /F1 11 Tf 50 ${740 - i * 18} Td (${esc(l)}) Tj ET`)].join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return out;
}
for (const f of fs.readdirSync(docs)) {
  const [prefix, typeRaw, extra] = f.replace('.json', '').split('-');
  const d = JSON.parse(fs.readFileSync(path.join(docs, f), 'utf8'));
  const lines = [TITLES[d.docType] + (extra ? ' (AMENDED)' : ''), ...Object.entries(d.fields).map(([k, v]) => `${k}: ${v.value}${v.unit ? ' ' + v.unit : ''}${v.currency ? ' ' + v.currency : ''}`)];
  const name = `${prefix === 'C1' ? 'C' : prefix}-${FILE[typeRaw]}${extra ? '-amended' : ''}.pdf`;
  fs.writeFileSync(path.join(dir, name), pdf(lines));
}
console.log(fs.readdirSync(dir).join('\n'));
