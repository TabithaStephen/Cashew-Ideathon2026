'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motionTokens } from '@/lib/motion';
import { cn } from '@/lib/utils';

// Open dialogs, newest last. Only the top one answers Esc and Tab, so nested dialogs close one at a time.
const stack: string[] = [];
export const hasOpenDialog = () => stack.length > 0;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useModalBehaviour(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement>) {
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push(id);
    document.documentElement.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === 'Escape') {
        close.current();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const active = document.activeElement as HTMLElement | null;
      // The demo panel and toasts float above the scrim and keep their own focus.
      if (active?.closest('[data-above-scrim]')) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!active || !panel.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.documentElement.style.overflow = '';
      opener?.focus?.();
    };
  }, [open, id, panel]);
}

export interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName: string;
  /** Where the panel slides from. The fade stays when reduced motion is on. */
  enter: { x?: number | string; y?: number | string };
}

export function DialogShell({ open, onClose, title, children, footer, panelClassName, enter }: DialogShellProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useModalBehaviour(open && mounted, onClose, panel);

  if (!mounted) return null;
  const transition = { duration: motionTokens.base, ease: motionTokens.easeOut };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn('absolute flex flex-col bg-sheet', panelClassName)}
            initial={{ opacity: 0, ...enter }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...enter }}
            transition={transition}
          >
            <header className="flex flex-none items-center justify-between gap-4 border-b border-ink py-1 pl-4 pr-1">
              <h2 id={titleId}>{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 flex-none place-items-center rounded-control hover:bg-paper">
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            {footer && <footer className="flex flex-none flex-wrap justify-end gap-2 border-t border-rule p-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
