'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motionTokens } from '@/lib/motion';
import { STATUS, StatusIcon } from './status';

const AUTO_DISMISS_MS = 4000;

type ToastTone = 'pass' | 'fail' | 'warn' | 'info';
interface ToastOptions {
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used inside ToastProvider');
  return toast;
}

// The timer stops while the pointer or keyboard focus is on the toast, so an action can't vanish mid-reach.
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const tone = item.tone ?? 'info';
  const [held, setHeld] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => dismiss.current(item.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [held, item.id]);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="pointer-events-auto flex min-h-11 items-center gap-2 border border-ink bg-sheet px-3 py-2 text-table"
    >
      <span className={STATUS[tone].text}>
        <StatusIcon kind={tone} />
      </span>
      <span className="min-w-0 flex-1">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="-my-2 min-h-11 flex-none font-semibold underline underline-offset-4"
          onClick={() => {
            item.action?.onClick();
            onDismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
    </motion.li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, message, ...options }]);
  }, []);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Above the scrim, so "Copied" still shows when a hash is copied inside a drawer. */}
      <ul
        role="status"
        aria-live="polite"
        data-above-scrim
        className="pointer-events-none fixed bottom-[calc(16px+var(--tour-height))] right-4 z-[80] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {items.slice(-3).map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ul>
    </ToastContext.Provider>
  );
}
