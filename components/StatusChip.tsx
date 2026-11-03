'use client';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Info, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CheckResult, TradeStatus } from '@/lib/types';

export type ChipVariant = 'pass' | 'fail' | 'unknown' | 'pending' | 'running' | 'warn' | 'info' | 'neutral' | 'brand';

const V: Record<ChipVariant, { cls: string; Icon: typeof Info; label: string }> = {
  pass: { cls: 'bg-success-soft text-success', Icon: CheckCircle2, label: 'Pass' },
  fail: { cls: 'bg-danger-soft text-danger', Icon: XCircle, label: 'Fail' },
  unknown: { cls: 'bg-unknown-soft text-unknown', Icon: HelpCircle, label: 'Unknown' },
  pending: { cls: 'bg-canvas text-ink-2 border border-line', Icon: Clock, label: 'Pending' },
  running: { cls: 'bg-brand-soft text-brand', Icon: Loader2, label: 'Running' },
  warn: { cls: 'bg-warn-soft text-warn', Icon: AlertTriangle, label: 'Needs attention' },
  info: { cls: 'bg-brand-soft text-brand', Icon: Info, label: 'Info' },
  neutral: { cls: 'bg-canvas text-ink-2 border border-line', Icon: Info, label: '' },
  brand: { cls: 'bg-brand text-white', Icon: CheckCircle2, label: '' },
};

/** StatusChip (5.4 #2): icon + label on a soft background. Colour is never the only signal. */
export function StatusChip({ variant, label, className, icon = true, title }: { variant: ChipVariant; label?: string; className?: string; icon?: boolean; title?: string }) {
  const v = V[variant];
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-caption font-medium whitespace-nowrap', v.cls, className)}>
      {icon && <v.Icon size={13} strokeWidth={2} aria-hidden className={variant === 'running' ? 'animate-spin' : ''} />}
      {label ?? v.label}
    </span>
  );
}

export const resultVariant = (r: CheckResult): ChipVariant => (r === 'warn' ? 'warn' : r);
export const resultLabel: Record<CheckResult, string> = { pass: 'Pass', fail: 'Fail', unknown: 'Unknown', pending: 'Pending', warn: 'Possible duplicate' };

const TS: Record<TradeStatus, [ChipVariant, string]> = {
  DRAFT: ['neutral', 'Draft'], SUBMITTED: ['info', 'Submitted'], VERIFYING: ['running', 'Verifying'], NEEDS_INFO: ['warn', 'Needs info'],
  VERIFIED: ['pass', 'Verified'], OFFERS_OPEN: ['info', 'Offers open'], OFFER_ACCEPTED: ['info', 'Offer accepted'],
  CONTRACT_SIGNED: ['info', 'Contract signed'], FINANCED: ['brand', 'Financed'], SHIPMENT_IN_TRANSIT: ['brand', 'In transit'],
  DELIVERED: ['brand', 'Delivered'], BUYER_ACCEPTED: ['brand', 'Buyer accepted'], REPAID: ['pass', 'Repaid'], CLOSED: ['pass', 'Closed'],
  REJECTED_VERIFICATION: ['fail', 'Rejected'], WITHDRAWN: ['neutral', 'Withdrawn'], DISPUTED: ['warn', 'Disputed'], DEFAULTED: ['fail', 'Defaulted'],
};
export function TradeStatusChip({ status }: { status: TradeStatus }) {
  const [v, l] = TS[status];
  return <StatusChip variant={v} label={l} />;
}

/** Source chip: "GST (simulated)". The suffix can be hidden for a clean video (never in a live room). */
export function SourceChip({ source, mode, showStaged = true }: { source: string; mode: 'staged' | 'real'; showStaged?: boolean }) {
  const real = mode === 'real';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 h-5 text-[11px] font-medium whitespace-nowrap border',
      real ? 'border-brand/30 text-brand bg-brand-soft' : 'border-line text-ink-2 bg-canvas')}>
      {source}{!real && showStaged ? ' (simulated)' : ''}
    </span>
  );
}
