'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useUI } from '@/lib/ui-store';
import { cn } from '@/lib/cn';

const ICON = { info: Info, success: CheckCircle2, warn: AlertTriangle, danger: XCircle };
const TONE = { info: 'text-brand', success: 'text-success', warn: 'text-warn', danger: 'text-danger' };

/** Toast stack (5.4 #9): bottom-right, 4 s auto-dismiss, icon + one line + optional action. */
export function ToastStack() {
  const { toasts, dismiss, sms } = useUI();
  return (
    <div style={{ bottom: sms ? 236 : 16 }} className="fixed right-4 transition-[bottom] duration-base z-[80] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }}
              className="bg-surface border border-line rounded-card shadow-md px-4 py-3 flex items-center gap-3" role="status">
              <Icon size={18} strokeWidth={1.75} className={cn('shrink-0', TONE[t.tone])} aria-hidden />
              <p className="text-sm flex-1">{t.text}</p>
              {t.action && <Link href={t.action.href} className="text-sm font-medium text-brand hover:underline">{t.action.label}</Link>}
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-ink-3 hover:text-ink"><X size={16} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
