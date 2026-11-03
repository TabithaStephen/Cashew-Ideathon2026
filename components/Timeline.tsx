import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Timeline (5.4 #11): milestones with done / current / upcoming states. `current` = index of the current step. */
export function Timeline({ steps, current, orientation = 'horizontal', notes }: { steps: readonly string[]; current: number; orientation?: 'horizontal' | 'vertical'; notes?: Record<number, React.ReactNode> }) {
  const dot = (i: number) => {
    const done = i < current, cur = i === current;
    return (
      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 bg-surface transition-colors duration-base',
        done ? 'bg-brand border-brand text-white' : cur ? 'border-accent' : 'border-line')} aria-label={done ? 'Done' : cur ? 'Current' : 'Upcoming'}>
        {done ? <Check size={11} strokeWidth={3} /> : cur ? <span className="w-2 h-2 rounded-full bg-accent" /> : null}
      </span>
    );
  };
  if (orientation === 'vertical') {
    return (
      <ol className="relative">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 pb-5 last:pb-0 relative">
            {i < steps.length - 1 && <span className={cn('absolute left-[9px] top-5 bottom-0 w-0.5', i < current ? 'bg-brand' : 'bg-line')} />}
            {dot(i)}
            <div className="-mt-0.5">
              <p className={cn('text-sm', i === current ? 'font-semibold text-ink' : i < current ? 'text-ink' : 'text-ink-3')}>{s}</p>
              {notes?.[i] && <div className="text-caption text-ink-3 mt-0.5">{notes[i]}</div>}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="flex items-start w-full">
      {steps.map((s, i) => (
        <li key={s} className="flex-1 flex flex-col items-center relative min-w-0">
          {i > 0 && <span className={cn('absolute top-[9px] right-1/2 w-full h-0.5 -z-0', i <= current ? 'bg-brand' : 'bg-line')} />}
          <span className="relative z-10">{dot(i)}</span>
          <span className={cn('text-caption mt-1.5 text-center truncate max-w-full px-1', i === current ? 'text-ink font-semibold' : i < current ? 'text-ink-2' : 'text-ink-3')}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
