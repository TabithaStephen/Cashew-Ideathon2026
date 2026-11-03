'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useUI } from '@/lib/ui-store';

function useEscClose(open: boolean, onClose: () => void) {
  const esc = useUI((s) => s.escTick);
  const first = useRef(esc);
  useEffect(() => { if (open && esc !== first.current) onClose(); first.current = esc; }, [esc]); // eslint-disable-line react-hooks/exhaustive-deps
}
function useFocusTrap(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button, input, textarea, select')?.focus(), 30);
    return () => { clearTimeout(t); prev?.focus?.(); };
  }, [open]);
  return ref;
}

/** Drawer (5.4 #7): 480px from the right, md shadow, scrim 24% ink, header with title + close. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  const reduce = useReducedMotion();
  useEscClose(open, onClose);
  const ref = useFocusTrap(open);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Details'}>
          <motion.div className="absolute inset-0" style={{ background: 'var(--scrim)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div ref={ref} className="absolute right-0 top-0 bottom-0 bg-surface shadow-md flex flex-col max-w-full" style={{ width }}
            initial={reduce ? { opacity: 0 } : { x: width }} animate={reduce ? { opacity: 1 } : { x: 0 }} exit={reduce ? { opacity: 0 } : { x: width }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-start justify-between gap-3 px-6 h-16 border-b border-line shrink-0 pt-4">
              <div className="min-w-0"><h3 className="text-h3 truncate">{title}</h3>{subtitle && <p className="text-caption text-ink-3 -mt-0.5">{subtitle}</p>}</div>
              <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-btn text-ink-3 hover:text-ink hover:bg-canvas"><X size={20} strokeWidth={1.75} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="border-t border-line px-6 py-4 shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Modal (5.4 #8): 560px centred, md shadow. */
export function Modal({ open, onClose, title, children, footer, width = 560, dismissable = true }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number; dismissable?: boolean }) {
  useEscClose(open && dismissable, onClose);
  const ref = useFocusTrap(open);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}>
          <motion.div className="absolute inset-0" style={{ background: 'var(--scrim)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dismissable ? onClose : undefined} />
          <motion.div ref={ref} className={cn('relative bg-surface rounded-card shadow-md w-full max-h-[90vh] flex flex-col')} style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-h3">{title}</h3>
              {dismissable && <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-btn text-ink-3 hover:text-ink hover:bg-canvas"><X size={20} strokeWidth={1.75} /></button>}
            </div>
            <div className="px-6 pb-5 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-line px-6 py-4 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
