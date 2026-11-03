'use client';
import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Count-up 600ms (skipped with reduced motion). */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN') }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const prev = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration: 0.6, ease: 'easeOut', onUpdate: setShown });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <>{format(shown)}</>;
}

/** StatCard (5.4 #3): caption label, H2 tabular value, coloured delta line. */
export function StatCard({ label, value, numeric, format, delta, tone = 'ink', className, icon }: {
  label: string; value?: React.ReactNode; numeric?: number; format?: (n: number) => string; delta?: React.ReactNode; tone?: 'ink' | 'success' | 'warn' | 'danger'; className?: string; icon?: React.ReactNode;
}) {
  const toneCls = { ink: 'text-ink-3', success: 'text-success', warn: 'text-warn', danger: 'text-danger' }[tone];
  return (
    <div className={cn('bg-surface border border-line rounded-card shadow-sm p-6', className)}>
      <div className="flex items-center justify-between"><p className="text-caption text-ink-3">{label}</p>{icon}</div>
      <p className="font-display text-h2 tabular mt-1">{numeric !== undefined ? <CountUp value={numeric} format={format} /> : value}</p>
      {delta && <p className={cn('text-caption mt-1', toneCls)}>{delta}</p>}
    </div>
  );
}
