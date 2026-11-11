'use client';

import { AlertTriangle, Check, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DocSlotState = 'empty' | 'hover' | 'scanning' | 'extracted' | 'needs-review';

export interface DocSlotProps {
  docName: string;
  /** 'hover' is normally reached by pointer or drag. Passing it forces the look, for the kit. */
  state?: DocSlotState;
  fileName?: string;
  fieldCount?: number;
  reviewCount?: number;
  onFile?: (file: File) => void;
  action?: ReactNode;
  accept?: string;
}

function PageThumb() {
  return (
    <span aria-hidden="true" className="relative block h-[72px] w-14 flex-none overflow-hidden border border-ink bg-sheet p-1.5">
      {[100, 70, 100, 85, 60, 100].map((width, i) => (
        <span key={i} className="mb-1.5 block h-0.5 bg-rule" style={{ width: `${width}%` }} />
      ))}
      <span className="absolute inset-x-0 h-0.5 animate-scan-line bg-ink motion-reduce:hidden" />
    </span>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function DocSlot({ docName, state = 'empty', fileName, fieldCount = 0, reviewCount = 0, onFile, action, accept = '.pdf,.png,.jpg,.jpeg' }: DocSlotProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const waiting = state === 'empty' || state === 'hover';
  const lit = state === 'hover' || dragging;

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile?.(file);
  };

  const frame = 'flex min-h-[120px] w-full items-center gap-3 rounded-control p-3 text-left';

  if (waiting) {
    return (
      <>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            frame,
            'border border-dashed transition-colors duration-fast',
            lit ? 'border-ink bg-sheet' : 'border-ink-3 bg-transparent hover:border-ink hover:bg-sheet',
          )}
        >
          <Upload size={18} strokeWidth={2} aria-hidden="true" className="flex-none" />
          <span className="min-w-0">
            <span className="block font-semibold">{docName}</span>
            <span className="block text-table text-ink-2">{lit && dragging ? 'Drop to upload' : 'Drop a file here, or choose one'}</span>
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile?.(file);
            event.target.value = ''; // So choosing the same file again still fires.
          }}
        />
      </>
    );
  }

  const review = state === 'needs-review';
  return (
    <div
      className={cn(
        frame,
        'border',
        state === 'scanning' && 'border-dashed border-ink bg-sheet',
        state === 'extracted' && 'border-pass bg-pass-soft',
        review && 'border-warn bg-warn-soft',
      )}
    >
      {state === 'scanning' && <PageThumb />}
      {state === 'extracted' && <Check size={18} strokeWidth={2} aria-hidden="true" className="flex-none text-pass" />}
      {review && <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" className="flex-none text-warn" />}
      <div className="min-w-0 flex-1" role="status">
        <p className="font-semibold">{docName}</p>
        {fileName && <p className="break-all font-mono text-label text-ink-2">{fileName}</p>}
        {state === 'scanning' && <p className="text-table text-ink-2">Reading this document</p>}
        {state === 'extracted' && <p className="text-table font-semibold text-pass">{plural(fieldCount, 'field')} extracted</p>}
        {review && (
          <p className="text-table font-semibold text-warn">
            {plural(reviewCount, 'field')} need{reviewCount === 1 ? 's' : ''} review
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
