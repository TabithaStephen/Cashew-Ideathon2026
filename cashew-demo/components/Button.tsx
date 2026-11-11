'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-control border font-medium no-underline transition-colors duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-55 aria-busy:cursor-progress',
  {
    variants: {
      variant: {
        primary: 'border-ink bg-accent font-semibold text-ink hover:bg-accent-press',
        secondary: 'border-ink bg-sheet text-ink hover:bg-paper',
        ghost: 'border-transparent bg-transparent text-ink underline underline-offset-4 hover:bg-pending-soft',
        danger: 'border-fail bg-fail font-semibold text-sheet hover:border-fail-press hover:bg-fail-press',
      },
      // Compact is for desktop tables. Phones keep the 44px tap target.
      size: {
        default: 'h-11 px-4',
        compact: 'h-9 px-3 text-table max-md:h-11',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  loading?: boolean;
  /** Renders the child element (usually a link) with button styling. The spinner needs a real button. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, asChild = false, className, children, onClick, type, ...rest },
  ref,
) {
  const classes = cn(button({ variant, size }), className);
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...rest}>
        {children}
      </Slot>
    );
  }
  // Stays focusable while loading, so keyboard users don't lose their place.
  const guarded = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) event.preventDefault();
    else onClick?.(event);
  };
  return (
    <button ref={ref} type={type ?? 'button'} className={classes} aria-busy={loading || undefined} onClick={guarded} {...rest}>
      {loading && <Loader2 size={18} strokeWidth={2} aria-hidden="true" className="animate-spin" />}
      {children}
    </button>
  );
});
