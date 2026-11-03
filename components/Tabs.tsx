'use client';
import { cn } from '@/lib/cn';

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; badge?: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-line overflow-x-auto', className)}
      onKeyDown={(e) => {
        const i = tabs.findIndex((t) => t.id === value);
        if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].id);
        if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
      }}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1} onClick={() => onChange(t.id)}
          className={cn('relative px-3 h-10 text-sm whitespace-nowrap transition-colors duration-fast',
            value === t.id ? 'text-brand font-semibold' : 'text-ink-2 hover:text-ink')}>
          <span className="inline-flex items-center gap-1.5">{t.label}{t.badge}</span>
          {value === t.id && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand rounded-full" />}
        </button>
      ))}
    </div>
  );
}
