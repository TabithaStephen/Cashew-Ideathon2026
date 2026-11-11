import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MilestoneState = 'done' | 'current' | 'upcoming';
export interface Milestone {
  title: string;
  detail?: ReactNode;
  at?: string;
  state: MilestoneState;
}

const WORD: Record<MilestoneState, string> = { done: 'done', current: 'current step', upcoming: 'not started' };

// Horizontal needs room, so it falls back to vertical on phones.
export function Timeline({ items, orientation = 'vertical', label = 'Milestones' }: { items: Milestone[]; orientation?: 'vertical' | 'horizontal'; label?: string }) {
  const across = orientation === 'horizontal';
  return (
    <ol aria-label={label} className={cn('flex flex-col', across && 'md:flex-row')}>
      {items.map((item, index) => (
        <li
          key={item.title}
          aria-current={item.state === 'current' ? 'step' : undefined}
          className={cn('relative min-w-0 pb-5 pl-8 last:pb-0', across && 'md:flex-1 md:pb-0 md:pl-0 md:pr-4 md:pt-8')}
        >
          {index < items.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 left-[9px] top-[22px] w-0.5',
                across && 'md:bottom-auto md:left-5 md:right-0 md:top-[9px] md:h-0.5 md:w-auto',
                item.state === 'done' ? 'bg-ink' : 'bg-rule',
              )}
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-0.5 grid size-5 place-items-center rounded-control border-2',
              across && 'md:top-0',
              item.state === 'done' && 'border-ink bg-ink text-sheet',
              item.state === 'current' && 'border-ink bg-accent',
              item.state === 'upcoming' && 'border-rule bg-sheet',
            )}
          >
            {item.state === 'done' && <Check size={14} strokeWidth={2} />}
          </span>
          <p className={cn('font-semibold', item.state === 'upcoming' && 'font-normal text-ink-3')}>
            {item.title}
            <span className="sr-only"> ({WORD[item.state]})</span>
          </p>
          {item.detail && <p className="text-table text-ink-2">{item.detail}</p>}
          {item.at && <p className="tabular text-table text-ink-3">{item.at}</p>}
        </li>
      ))}
    </ol>
  );
}
