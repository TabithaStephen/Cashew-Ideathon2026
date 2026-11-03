'use client';
import { AlertTriangle, Check } from 'lucide-react';
import { Drawer } from '@/components/Overlay';
import { HashPill } from '@/components/HashPill';
import { Button } from '@/components/Button';
import { api } from '@/lib/client';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/lib/format';
import { DOC_LABELS, type Doc } from '@/lib/types';

const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace('Hs', 'HS').replace('Irn', 'IRN').replace('Bl ', 'BL ').replace('Sb ', 'SB ');

export const reviewCount = (d?: Doc) => (d ? Object.values(d.extracted.fields).filter((f) => f.confidence < 0.85 && !f.reviewed).length : 0);

export function DocDetailDrawer({ doc, onClose, canReview }: { doc: Doc | null; onClose: () => void; canReview?: boolean }) {
  return (
    <Drawer open={!!doc} onClose={onClose} width={640} title={doc ? DOC_LABELS[doc.type] : ''} subtitle={doc ? `${doc.fileName} · v${doc.version}${doc.amended ? ' · amended' : ''}` : ''}
      footer={doc && <div className="flex items-center justify-between"><span className="text-caption text-ink-3">File SHA-256 (uploaded {fmtDateTime(doc.uploadedAt)})</span><HashPill value={doc.sha256} label="File hash" /></div>}>
      {doc && (
        <div className="grid grid-cols-[150px_1fr] gap-5">
          <div>
            <div className="aspect-[3/4] rounded-btn bg-surface border border-line shadow-sm p-3 space-y-1.5">
              <div className="h-2 w-16 bg-ink/25 rounded" /><div className="h-1.5 w-10 bg-accent/40 rounded mb-3" />
              {Array.from({ length: 14 }).map((_, i) => <div key={i} className="h-1 bg-line rounded" style={{ width: `${40 + ((i * 37) % 55)}%` }} />)}
            </div>
            <p className="text-caption text-ink-3 mt-2">Extraction is simulated from seeded data. The file itself is hashed for real.</p>
          </div>
          <table className="w-full text-table self-start">
            <thead><tr className="text-left text-caption text-ink-3 border-b border-line"><th className="font-medium py-1.5">Field</th><th className="font-medium py-1.5">Value</th><th className="font-medium py-1.5 text-right">Confidence</th></tr></thead>
            <tbody>
              {Object.entries(doc.extracted.fields).map(([k, f]) => {
                const low = f.confidence < 0.85 && !f.reviewed;
                return (
                  <tr key={k} className={cn('border-b border-line last:border-0', low && 'bg-warn-soft')}>
                    <td className="py-1.5 pr-2 text-ink-2">{label(k)}</td>
                    <td className="py-1.5 pr-2 tabular font-medium break-all">{String(f.value)}{f.unit ? ` ${f.unit}` : ''}{f.currency ? ` ${f.currency}` : ''}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-warn font-medium"><AlertTriangle size={13} />{f.confidence.toFixed(2)}
                          {canReview && <Button compact variant="secondary" className="ml-2 h-7" onClick={() => api(`/api/trades/${doc.tradeId}/documents/review`, { json: { docId: doc.id, field: k } })}>Confirm</Button>}</span>
                      ) : <span className={cn('tabular', f.reviewed ? 'text-success' : 'text-ink-3')}>{f.reviewed ? <span className="inline-flex items-center gap-1"><Check size={13} />reviewed</span> : f.confidence.toFixed(2)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Drawer>
  );
}
