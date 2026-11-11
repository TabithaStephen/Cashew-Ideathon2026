import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// `current` is the index of the active step. Steps before it are done.
export function Stepper({ steps, current, label = 'Progress' }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol aria-label={label} className="flex w-full">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="relative min-w-0 flex-1 pr-2 last:flex-none last:pr-0">
            {index < steps.length - 1 && (
              <span aria-hidden="true" className={cn('absolute left-8 right-1 top-[13px] h-0.5', done ? 'bg-ink' : 'bg-rule')} />
            )}
            <span
              className={cn(
                'tabular grid size-7 place-items-center rounded-control border-2 text-table font-semibold',
                done && 'border-ink bg-ink text-sheet',
                active && 'border-ink bg-accent text-ink',
                !done && !active && 'border-rule bg-sheet text-ink-3',
              )}
            >
              {done ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn('mt-1 block text-table', active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-ink-3')}>
              {step}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
