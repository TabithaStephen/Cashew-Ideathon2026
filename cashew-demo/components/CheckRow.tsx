'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { STATUS, StatusIcon, type StatusKind } from './status';

export interface CheckRowProps {
  title: string;
  source: string;
  result: string;
  status: StatusKind;
  statusLabel?: string;
  duration?: string;
  /** Evidence shown when expanded. Without it the row is static. */
  children?: ReactNode;
  defaultOpen?: boolean;
  /** Strokes the tick in. Use when a live result arrives, not on rows already settled. */
  drawTick?: boolean;
  /** Opens evidence elsewhere (the drawer) instead of expanding in place. */
  onOpen?: () => void;
}

export function CheckRow({ title, source, result, status, statusLabel, duration, children, defaultOpen = false, drawTick = false, onOpen }: CheckRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const expandable = Boolean(children);

  const body = (
    <>
      <span className={cn('mt-0.5 flex-none', STATUS[status].text)}>
        <StatusIcon kind={status} size={24} draw={drawTick} />
      </span>
      <span className="cr-body min-w-0 flex-1">
        <span className="cr-text">
          <span className="block text-table font-semibold">{title}</span>
          <span className="block text-table text-ink-2">{result}</span>
        </span>
        <span className="cr-meta">
          <span className="w-fit rounded-control border border-rule px-1.5 py-0.5 font-mono text-label text-ink-2">{source}</span>
          <span className={cn('text-table font-semibold', STATUS[status].text)}>{statusLabel ?? STATUS[status].label}</span>
          <span className="cr-time tabular text-table text-ink-3">{duration}</span>
        </span>
      </span>
    </>
  );

  const rowClass = 'flex min-h-14 w-full items-start gap-3 px-4 py-2 text-left';

  return (
    <div className="cq border-b border-rule bg-sheet last:border-b-0">
      {onOpen ? (
        <button type="button" className={cn(rowClass, 'transition-colors duration-fast hover:bg-paper')} onClick={onOpen} aria-haspopup="dialog">
          {body}
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none" />
        </button>
      ) : expandable ? (
        <button type="button" className={cn(rowClass, 'transition-colors duration-fast hover:bg-paper')} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {body}
          <ChevronDown size={18} strokeWidth={2} aria-hidden="true" className={cn('mt-0.5 flex-none transition-transform duration-fast', open && 'rotate-180')} />
        </button>
      ) : (
        <div className={rowClass}>
          {body}
          <span className="w-[18px] flex-none" />
        </div>
      )}
      {expandable && !onOpen && (
        <div id={panelId} hidden={!open} className="border-t border-rule bg-paper px-4 py-3 text-table md:pl-[52px]">
          {children}
        </div>
      )}
    </div>
  );
}
