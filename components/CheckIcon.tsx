'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Circle, HelpCircle, Loader2, X } from 'lucide-react';
import type { CheckResult } from '@/lib/types';

/** 24px status icon. Pass draws its check-mark stroke in 300ms. */
export function CheckIcon({ state, size = 24 }: { state: CheckResult | 'running' | 'idle'; size?: number }) {
  const reduce = useReducedMotion();
  const ring = 'rounded-full flex items-center justify-center shrink-0';
  if (state === 'running') return <span className={`${ring} bg-brand-soft text-brand`} style={{ width: size, height: size }}><Loader2 size={size * 0.62} strokeWidth={2} className="animate-spin" aria-label="Running" /></span>;
  if (state === 'idle') return <span className={`${ring} text-line`} style={{ width: size, height: size }}><Circle size={size} strokeWidth={1.5} aria-label="Not run" /></span>;
  if (state === 'pending') return <span className={`${ring} border border-dashed border-ink-3 text-ink-3`} style={{ width: size, height: size }} aria-label="Pending"><span className="block w-1.5 h-1.5 rounded-full bg-ink-3" /></span>;
  if (state === 'unknown') return <span className={`${ring} bg-unknown-soft text-unknown`} style={{ width: size, height: size }}><HelpCircle size={size * 0.66} strokeWidth={2} aria-label="Unknown" /></span>;
  if (state === 'warn') return <span className={`${ring} bg-warn-soft text-warn`} style={{ width: size, height: size }}><AlertTriangle size={size * 0.6} strokeWidth={2} aria-label="Needs attention" /></span>;
  if (state === 'fail') return <span className={`${ring} bg-danger text-white`} style={{ width: size, height: size }}><X size={size * 0.62} strokeWidth={2.5} aria-label="Failed" /></span>;
  return (
    <span className={`${ring} bg-success text-white`} style={{ width: size, height: size }} aria-label="Passed">
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </svg>
    </span>
  );
}
