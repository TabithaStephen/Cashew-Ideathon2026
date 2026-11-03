'use client';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; compact?: boolean; loading?: boolean; icon?: React.ReactNode; }

const styles: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand/90 disabled:bg-brand/50',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas hover:border-ink-3/40 disabled:text-ink-3',
  ghost: 'bg-transparent text-ink-2 hover:bg-brand-soft hover:text-brand disabled:text-ink-3',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
  accent: 'bg-accent text-white hover:bg-accent/90 disabled:bg-accent/50',
};

/** Button (5.4 #1): primary, secondary, ghost, danger. 40px (36px compact), radius 10px, inline spinner. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', compact, loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn px-4 font-medium transition-colors duration-fast ease-out whitespace-nowrap disabled:cursor-not-allowed',
        compact ? 'h-9 text-[13px] px-3' : 'h-10 text-sm',
        styles[variant], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
