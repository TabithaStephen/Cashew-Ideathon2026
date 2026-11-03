import { cn } from '@/lib/cn';
export function Card({ className, children, as: As = 'div', ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article' }) {
  return <As className={cn('bg-surface border border-line rounded-card shadow-sm p-6', className)} {...rest}>{children}</As>;
}
export function CardHeader({ title, subtitle, right, className }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        <h3 className="text-h3">{title}</h3>
        {subtitle && <p className="text-caption text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) { return <div className={cn('skeleton rounded-btn', className)} aria-hidden />; }
export function Caption({ className, children }: { className?: string; children: React.ReactNode }) { return <p className={cn('text-caption text-ink-3', className)}>{children}</p>; }
