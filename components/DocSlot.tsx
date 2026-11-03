'use client';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export type DocSlotState = 'empty' | 'hover' | 'scanning' | 'extracted' | 'review';

/** DocSlot (5.4 #6): dashed 120px dropzone. empty → hover → scanning (scan-line) → extracted | needs review. */
export function DocSlot({ label, state, fieldCount, reviewCount = 0, fileName, version, onFile, onOpen, disabled, amended }: {
  label: string; state: DocSlotState; fieldCount?: number; reviewCount?: number; fileName?: string; version?: number;
  onFile?: (f: File) => void; onOpen?: () => void; disabled?: boolean; amended?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const shown: DocSlotState = drag && (state === 'empty' || state === 'hover') ? 'hover' : state;
  const done = shown === 'extracted' || shown === 'review';
  const click = () => { if (done && onOpen) onOpen(); else if (!disabled && shown !== 'scanning') input.current?.click(); };
  return (
    <div
      role="button" tabIndex={0} aria-label={`${label}: ${shown === 'empty' ? 'drop a file or press Enter to choose' : shown}`}
      onClick={click} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f && onFile && !disabled) onFile(f); }}
      className={cn('relative h-[120px] rounded-card border-2 border-dashed flex items-center gap-4 px-4 cursor-pointer select-none transition-colors duration-base overflow-hidden',
        shown === 'empty' && 'border-line bg-surface hover:border-brand/50 hover:bg-brand-soft/30',
        shown === 'hover' && 'border-brand bg-brand-soft',
        shown === 'scanning' && 'border-brand/40 bg-surface cursor-progress',
        shown === 'extracted' && 'border-success/40 bg-success-soft/40 border-solid',
        shown === 'review' && 'border-warn/60 bg-warn-soft/60 border-solid')}
    >
      <input ref={input} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && onFile) onFile(f); e.target.value = ''; }} />
      {/* page thumbnail */}
      <div className="relative w-[64px] h-[84px] rounded-md bg-surface border border-line shadow-sm shrink-0 overflow-hidden">
        <div className="absolute inset-x-2 top-2 space-y-1.5">
          <div className="h-1.5 w-8 bg-ink/20 rounded" />
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-1 bg-line rounded" style={{ width: `${[90, 70, 85, 60, 80, 50, 75][i]}%` }} />)}
        </div>
        {shown === 'scanning' && <div className="scan-line absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_8px_2px_rgb(var(--c-accent)/0.5)] animate-scan" />}
        {done && <div className="absolute bottom-1 right-1">{shown === 'review' ? <AlertTriangle size={16} className="text-warn" /> : <CheckCircle2 size={16} className="text-success" />}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink flex items-center gap-2">{label}{amended && <span className="text-[11px] font-medium text-brand bg-brand-soft rounded-full px-2">Amended</span>}</p>
        {shown === 'empty' && <p className="text-table text-ink-3 flex items-center gap-1.5 mt-1"><UploadCloud size={16} strokeWidth={1.75} /> Drop a file or click to choose</p>}
        {shown === 'hover' && <p className="text-table text-brand font-medium mt-1">Release to upload</p>}
        {shown === 'scanning' && <p className="text-table text-brand mt-1">Reading document…</p>}
        {shown === 'extracted' && <p className="text-table text-success font-medium mt-1 flex items-center gap-1.5"><CheckCircle2 size={16} /> {fieldCount} fields extracted</p>}
        {shown === 'review' && <p className="text-table text-warn font-medium mt-1 flex items-center gap-1.5"><AlertTriangle size={16} /> {reviewCount} field{reviewCount === 1 ? '' : 's'} need{reviewCount === 1 ? 's' : ''} review</p>}
        {fileName && done && <p className="text-caption text-ink-3 mt-1 truncate flex items-center gap-1"><FileText size={12} /> {fileName}{version && version > 1 ? ` · v${version}` : ''}</p>}
      </div>
    </div>
  );
}
