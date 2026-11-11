'use client';

import { useState } from 'react';
import { DocSlot } from '@/components/DocSlot';
import { DOC_LABEL, FIELD_LABEL, fieldValue } from '@/lib/ui';
import { cn } from '@/lib/utils';

// Extracted fields beside a page thumbnail (Blueprint 7.4). Also used read-only in the lender portal.
export function DocumentsView({ docs }: { docs: any[] }) {
  const [openId, setOpenId] = useState<string>();
  if (docs.length === 0) return <div className="panel px-4 py-8">No documents on this trade.</div>;
  const open = docs.find((d) => d.id === openId) ?? docs[0];
  return (
    <div className="cq"><div className="docs-view">
      <div className="docs-list">
        {docs.map((doc) => {
          const fields = Object.values(doc.extracted) as any[];
          const review = fields.filter((f) => f.confidence < 0.85).length;
          return (
            <button key={doc.id} type="button" aria-pressed={doc.id === open.id} onClick={() => setOpenId(doc.id)} className={cn('text-left', doc.id === open.id && 'outline outline-2 outline-ink')}>
              <span className="pointer-events-none block" tabIndex={-1}>
                <DocSlot docName={`${DOC_LABEL[doc.type]}${doc.version > 1 ? ` (version ${doc.version})` : ''}`} state={review > 0 ? 'needs-review' : 'extracted'} fileName={doc.fileName} fieldCount={fields.length} reviewCount={review} />
              </span>
            </button>
          );
        })}
      </div>
      <section className="panel docs-detail min-w-0 p-4">
        <a href={open.pdf} target="_blank" rel="noreferrer" className="block h-40 w-[120px] border border-ink bg-sheet p-2 text-[12px] leading-4 underline underline-offset-4">
          <span aria-hidden="true" className="mb-2 block space-y-1.5">{[100, 70, 100, 85, 60].map((w) => <span key={w} className="block h-0.5 bg-rule" style={{ width: `${w}%` }} />)}</span>
          Open sample PDF
        </a>
        <div className="min-w-0">
          <h2 className="mb-2">{DOC_LABEL[open.type]}</h2>
          <table className="ledger w-full border-collapse">
            <tbody>
              {Object.entries(open.extracted).map(([key, field]: [string, any]) => {
                const review = field.confidence < 0.85;
                return (
                  <tr key={key} className={cn(review && 'bg-warn-soft')}>
                    <th scope="row" className="font-medium text-ink-2">{FIELD_LABEL[key] ?? key}</th>
                    <td className={cn('tabular', key === 'irn' && 'break-all font-mono text-label')}>{fieldValue(field)}</td>
                    <td className={cn('tabular whitespace-nowrap text-right', review ? 'font-semibold text-warn' : 'text-ink-3')}>{review ? `Needs review ${field.confidence.toFixed(2)}` : field.confidence.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div></div>
  );
}
