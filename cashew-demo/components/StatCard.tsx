'use client';

import { animate, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionTokens } from '@/lib/motion';
import { cn } from '@/lib/utils';

const TONE = { pass: 'text-pass', fail: 'text-fail', warn: 'text-warn', neutral: 'text-ink-2' };
const plain = (value: number) => new Intl.NumberFormat('en-IN').format(value);

// Counts from the last shown number to the new one. Screen readers only ever get the final value.
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: motionTokens.countUp,
      ease: motionTokens.easeOut,
      onUpdate: setShown,
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

export interface StatCardProps {
  label: string;
  value: number | string;
  format?: (value: number) => string;
  delta?: ReactNode;
  deltaTone?: keyof typeof TONE;
  deltaDirection?: 'up' | 'down';
  /** Off by default: the number is shown straight away unless the screen asks for the effect. */
  countUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, format = plain, delta, deltaTone = 'neutral', deltaDirection, countUp = false, className }: StatCardProps) {
  const Arrow = deltaDirection === 'up' ? ArrowUp : ArrowDown;
  return (
    <div className={cn('border border-rule border-t-ink border-t-2 bg-sheet p-4', className)}>
      <p className="field-label">{label}</p>
      <p className="tabular mt-1 text-money">
        {typeof value === 'number' ? countUp ? <CountUp value={value} format={format} /> : format(value) : value}
      </p>
      {delta && (
        <p className={cn('mt-1 flex items-center gap-1 text-table', TONE[deltaTone])}>
          {deltaDirection && <Arrow size={14} strokeWidth={2} aria-hidden="true" className="flex-none" />}
          {delta}
        </p>
      )}
    </div>
  );
}
