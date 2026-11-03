import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Stepper (5.4 #5): numbered steps with connecting line; current filled brand; done shows a check. */
export function Stepper({ steps, current, onStep, maxReachable }: { steps: string[]; current: number; onStep?: (i: number) => void; maxReachable?: number }) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((s, i) => {
        const done = i < current, cur = i === current;
        const reachable = onStep && i <= (maxReachable ?? current);
        return (
          <li key={s} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
            <button type="button" disabled={!reachable} onClick={() => onStep?.(i)} aria-current={cur ? 'step' : undefined}
              className="flex items-center gap-2 shrink-0 disabled:cursor-default group">
              <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold tabular border transition-colors duration-base',
                cur ? 'bg-brand border-brand text-white' : done ? 'bg-brand-soft border-brand-soft text-brand' : 'bg-surface border-line text-ink-3')}>
                {done ? <Check size={15} strokeWidth={2.5} aria-label="Done" /> : i + 1}
              </span>
              <span className={cn('text-sm whitespace-nowrap', cur ? 'text-ink font-semibold' : done ? 'text-ink-2' : 'text-ink-3', reachable && !cur && 'group-hover:text-brand')}>{s}</span>
            </button>
            {i < steps.length - 1 && <span className={cn('h-px flex-1 mx-3', done ? 'bg-brand/40' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}
