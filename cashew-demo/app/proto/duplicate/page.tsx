import { createHash } from 'node:crypto';
import { similarity, type InvoiceFacts } from '@/lib/engines/fuzzy';
import { DuplicateView } from './DuplicateView';

// Sample registry entry and two attempts (Blueprint Sections 6.4, 11.4). All fictional.
const SALT = 'cashew-demo-salt';
const IRN = 'a5c1e7f09b3d4426b8e0d1c97f6a2e4413bd5c08e9f7a1626d4c0be3958f7a10';

const financed: InvoiceFacts = { invoiceNo: 'CKS/2627/0188', amount: 18400, date: '2026-09-14', currency: 'USD', irn: IRN };
const exact: InvoiceFacts = { ...financed };
const altered: InvoiceFacts = { invoiceNo: 'CKS/2627/0188-A', amount: 18900, date: '2026-09-16', currency: 'USD', irn: IRN };

function fingerprint(invoice: InvoiceFacts): string {
  const canonical = [SALT, 'org_coimbatore_knit', 'buyer_hartwell_rowe', invoice.invoiceNo.toUpperCase(), invoice.date, invoice.amount.toFixed(2), invoice.currency].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

export default function DuplicatePage() {
  return (
    <DuplicateView
      financed={financed}
      altered={altered}
      fingerprints={{ registry: fingerprint(financed), exact: fingerprint(exact), altered: fingerprint(altered) }}
      comparison={similarity(altered, financed)}
    />
  );
}
