'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const base = 'w-full h-10 rounded-input border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:bg-canvas';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(base, 'tabular', className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return <select ref={ref} className={cn(base, 'pr-8', className)} {...p}>{children}</select>;
});
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(base, 'h-auto min-h-[80px] py-2', className)} {...p} />;
});
export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-ink-2 mb-1.5">
      <span>{children}</span>{hint && <span className="text-caption text-ink-3 font-normal">{hint}</span>}
    </label>
  );
}
export function Checkbox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line accent-[rgb(var(--c-brand))] focus-visible:outline-2" />
      <span>{children}</span>
    </label>
  );
}
