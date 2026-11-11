import { AlertTriangle, Check, CircleHelp, Clock, Info, Loader2, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusKind = 'pass' | 'fail' | 'unknown' | 'pending' | 'running' | 'warn' | 'info';

export const STATUS: Record<StatusKind, { icon: LucideIcon; label: string; text: string; chip: string }> = {
  pass: { icon: Check, label: 'Pass', text: 'text-pass', chip: 'border-pass bg-pass-soft text-pass' },
  fail: { icon: X, label: 'Fail', text: 'text-fail', chip: 'border-fail bg-fail-soft text-fail' },
  unknown: { icon: CircleHelp, label: 'Unknown', text: 'text-unknown', chip: 'border-unknown bg-unknown-soft text-unknown' },
  pending: { icon: Clock, label: 'Pending', text: 'text-pending', chip: 'border-pending bg-pending-soft text-pending' },
  running: { icon: Loader2, label: 'Running', text: 'text-pending', chip: 'border-pending bg-pending-soft text-pending' },
  warn: { icon: AlertTriangle, label: 'Needs attention', text: 'text-warn', chip: 'border-warn bg-warn-soft text-warn' },
  info: { icon: Info, label: 'Info', text: 'text-ink-2', chip: 'border-ink-2 bg-sheet text-ink-2' },
};

// Always sits beside a word, so it stays hidden from screen readers. `draw` strokes the pass tick in.
export function StatusIcon({ kind, size = 18, draw = false }: { kind: StatusKind; size?: number; draw?: boolean }) {
  if (kind === 'pass' && draw) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
        <path d="M20 6 9 17l-5-5" pathLength={1} strokeDasharray={1} className="animate-check-draw" />
      </svg>
    );
  }
  const Icon = STATUS[kind].icon;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" className={cn('flex-none', kind === 'running' && 'animate-spin')} />;
}
