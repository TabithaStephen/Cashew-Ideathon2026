'use client';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { truncHash } from '@/lib/format';
import { useUI } from '@/lib/ui-store';

/** HashPill (5.4 #10): mono pill with truncated hash and copy-to-clipboard + "Copied" toast. */
export function HashPill({ value, full, label, className, head = 8, tail = 4 }: { value: string; full?: boolean; label?: string; className?: string; head?: number; tail?: number }) {
  const toast = useUI((s) => s.toast);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); } catch {
      const ta = document.createElement('textarea'); ta.value = value; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove();
    }
    toast({ tone: 'success', text: 'Copied' });
  };
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); copy(); }} title={`${label ? label + ': ' : ''}${value} (click to copy)`}
      aria-label={`Copy ${label ?? 'value'} ${value}`}
      className={cn('inline-flex items-center gap-1.5 rounded-full bg-canvas border border-line px-2.5 h-6 font-mono text-mono text-ink hover:border-brand/40 hover:bg-brand-soft transition-colors duration-fast max-w-full', className)}>
      <span className="truncate">{full ? value : truncHash(value, head, tail)}</span>
      <Copy size={12} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
    </button>
  );
}
