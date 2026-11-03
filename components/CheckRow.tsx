'use client';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { CheckResult } from '@/lib/types';
import { CheckIcon } from './CheckIcon';
import { SourceChip } from './StatusChip';
import { useUI } from '@/lib/ui-store';

export interface CheckRowProps {
  id: number; title: string; source: string; mode: 'staged' | 'real';
  state: CheckResult | 'running' | 'idle'; line?: string; durationMs?: number; flagged?: boolean;
  onOpen?: () => void; children?: React.ReactNode; defaultExpanded?: boolean; history?: number;
}

/** CheckRow (5.4 #4): 56px row. Status icon, title, source chip, result line, duration, chevron. Expandable. */
export function CheckRow({ id, title, source, mode, state, line, durationMs, flagged, onOpen, children, defaultExpanded, history }: CheckRowProps) {
  const [open, setOpen] = useState(!!defaultExpanded);
  const showStaged = useUI((s) => s.showStagedLabels);
  const tone = state === 'fail' ? 'bg-danger-soft/40' : state === 'warn' ? 'bg-warn-soft/50' : '';
  return (
    <div className={cn('border-b border-line last:border-b-0 transition-colors duration-base', tone)}>
      <div className="flex items-center gap-3 min-h-[56px] px-4 py-2">
        <CheckIcon state={state} />
        <button type="button" onClick={onOpen} disabled={!onOpen} className="flex-1 min-w-0 text-left group disabled:cursor-default">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-caption text-ink-3 tabular w-5">{id}</span>
            <span className="text-sm font-semibold text-ink group-hover:text-brand group-enabled:group-hover:underline underline-offset-2">{title}</span>
            <SourceChip source={source} mode={mode} showStaged={showStaged} />
            {flagged && <span className="text-[11px] font-medium text-warn">Flagged to lenders</span>}
            {!!history && history > 1 && <span className="text-[11px] text-ink-3">re-run ×{history - 1}</span>}
          </div>
          <p className={cn('text-table text-ink-2 pl-7 truncate', state === 'idle' && 'text-ink-3')}>
            {state === 'running' ? 'Checking…' : state === 'idle' ? 'Not run yet' : line ?? (state === 'pending' ? 'Queued' : '')}
          </p>
        </button>
        <span className="text-caption text-ink-3 tabular w-12 text-right">{durationMs !== undefined && state !== 'running' && state !== 'idle' ? `${(durationMs / 1000).toFixed(1)} s` : ''}</span>
        <button type="button" aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(!open)} className="p-1 rounded-btn text-ink-3 hover:text-ink hover:bg-canvas">
          <ChevronDown size={18} strokeWidth={1.75} className={cn('transition-transform duration-base', open && 'rotate-180')} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="pl-[52px] pr-4 pb-3 text-table text-ink-2">
              {children ?? <p>{line ?? 'No result yet.'}</p>}
              {onOpen && <button onClick={onOpen} className="mt-1 text-brand font-medium hover:underline">Open evidence</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
