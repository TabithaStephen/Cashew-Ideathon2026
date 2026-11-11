import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { STATUS, StatusIcon, type StatusKind } from './status';

export function StatusChip({ kind, children, className }: { kind: StatusKind; children?: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-control border px-1.5 py-0.5 text-label', STATUS[kind].chip, className)}>
      <StatusIcon kind={kind} size={14} />
      {children ?? STATUS[kind].label}
    </span>
  );
}
