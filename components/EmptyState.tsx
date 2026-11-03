import { cn } from '@/lib/cn';

export function CashewMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={cn('text-accent', className)}>
      <path d="M22.5 5.5c-5.6-1.6-12.3 1.4-14.6 7.6-2.4 6.3.8 13.2 6.9 13.6 3.7.3 5.4-2.2 4.6-4.6-.7-2.1-3.4-2.4-4.1-4.6-.9-2.6 1-5.4 4.2-5.6 2.6-.2 4.9.9 6.2-.6 1.4-1.7.1-4.9-3.2-5.8Z" fill="currentColor" />
      <circle cx="22" cy="9.5" r="1.4" fill="rgb(var(--c-surface))" />
    </svg>
  );
}

/** EmptyState (5.4 #14): line illustration, one sentence, one button. */
export function EmptyState({ text, action, className }: { text: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden className="text-ink-3 mb-4">
        <circle cx="44" cy="44" r="40" stroke="currentColor" strokeOpacity=".25" strokeDasharray="4 6" />
        <path d="M58 22c-12-3.5-26.5 3-31.5 16.4-5.2 13.6 1.7 28.5 14.9 29.4 8 .6 11.7-4.8 10-9.9-1.5-4.5-7.3-5.2-8.9-9.9-1.9-5.6 2.2-11.7 9.1-12.1 5.6-.4 10.6 1.9 13.4-1.3 3-3.7.2-10.6-7-12.6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx="57" cy="31" r="2" fill="currentColor" />
      </svg>
      <p className="text-body text-ink-2 max-w-sm">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
