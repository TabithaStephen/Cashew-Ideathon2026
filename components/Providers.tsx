'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hydrateUIFromStorage, useUI } from '@/lib/ui-store';
import { RUN_OF_SHOW } from '@/lib/demo/script';
import { DemoPanel, useDemoActions } from './DemoPanel';
import { DemoRibbon } from './DemoRibbon';
import { ToastStack } from './Toast';
import { Button } from './Button';
import { Modal } from './Overlay';

interface NotificationsRes { epoch: number; latestId: number; items: { id: number; kind: 'toast' | 'sms'; tone: 'info' | 'success' | 'warn' | 'danger'; text: string; tradeId?: string }[] }

/** Polls in-app notifications (toasts + simulated SMS) every second. */
function NotificationPoller() {
  const cursor = useRef<number | null>(null);
  const epoch = useRef<number | null>(null);
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/notifications?after=${cursor.current ?? 0}`, { cache: 'no-store' });
        if (!res.ok) return;
        const d: NotificationsRes = await res.json();
        if (stop) return;
        if (epoch.current !== d.epoch || cursor.current === null) { epoch.current = d.epoch; cursor.current = d.latestId; return; }
        for (const n of d.items) {
          if (n.kind === 'sms') useUI.getState().setSms({ id: n.id, text: n.text });
          else useUI.getState().toast({ tone: n.tone, text: n.text });
        }
        cursor.current = Math.max(cursor.current, d.latestId);
        if (d.items.length) window.dispatchEvent(new Event('cashew:refresh'));
      } catch { /* offline blip */ }
    };
    poll();
    const iv = setInterval(poll, 1000);
    return () => { stop = true; clearInterval(iv); };
  }, []);
  return null;
}

function SmsPreview() {
  const { sms, setSms } = useUI();
  return (
    <AnimatePresence>
      {sms && (
        <motion.div key={sms.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.22 }}
          className="fixed bottom-4 right-4 z-[75] w-[340px] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-card shadow-md overflow-hidden" role="status">
          <div className="flex items-center justify-between px-4 py-2 bg-success-soft">
            <span className="flex items-center gap-2 text-caption font-semibold text-success"><MessageCircle size={14} /> WhatsApp / SMS</span>
            <span className="flex items-center gap-2"><span className="text-[11px] font-medium text-ink-2 bg-surface/70 rounded-full px-2">Simulated message</span>
              <button aria-label="Dismiss message preview" onClick={() => setSms(null)} className="text-ink-3 hover:text-ink"><X size={14} /></button></span>
          </div>
          <div className="p-4"><div className="bg-canvas rounded-2xl rounded-tl-sm px-3 py-2 text-sm">{sms.text}</div><p className="text-[11px] text-ink-3 mt-1.5">To +91 98•••• ••210 · just now</p></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Global keyboard shortcuts (10.4): D panel, R reset (confirm), N next note, 1 2 3 scenario, Esc close. */
function Shortcuts() {
  const ui = useUI();
  const act = useDemoActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === 'Escape') { useUI.getState().bumpEsc(); if (useUI.getState().demoPanelOpen) useUI.getState().setDemoPanel(false); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === 'd') { e.preventDefault(); ui.setDemoPanel(!useUI.getState().demoPanelOpen); }
      else if (k === 'r') { e.preventDefault(); setConfirmReset(true); }
      else if (k === 'n') {
        e.preventDefault();
        const st = useUI.getState();
        const next = (st.presenterStep + 1) % RUN_OF_SHOW.length;
        if (!st.presenterNotes) st.setPresenterNotes(true);
        st.setPresenterStep(next);
        const href = RUN_OF_SHOW[next].href;
        if (href && href !== '/' && location.pathname !== href && next !== 0) router.push(href);
      }
      else if (['1', '2', '3'].includes(k)) { e.preventDefault(); act.scenario((['A', 'B', 'C'] as const)[Number(k) - 1]).catch(() => {}); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bind each render so the latest actions are used
  return (
    <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the demo?" width={420}
      footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button><Button data-autofocus onClick={async () => { setConfirmReset(false); await act.reset().catch(() => {}); }}>Reset</Button></>}>
      <p className="text-sm text-ink-2">This restores the seed state for the current scenario. It takes under a second.</p>
    </Modal>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const notes = useUI((s) => s.presenterNotes);
  useEffect(() => { document.documentElement.style.setProperty('--ribbon-h', notes ? '52px' : '24px'); }, [notes]);
  useEffect(() => {
    hydrateUIFromStorage();
    fetch('/api/demo/state').then((r) => r.json()).then((d) => typeof d.speed === 'number' && useUI.getState().setSpeed(d.speed)).catch(() => {});
  }, []);
  return (
    <>
      <DemoRibbon />
      <div className={notes ? 'pt-[52px]' : 'pt-ribbon'}>{children}</div>
      <NotificationPoller />
      <Shortcuts />
      <DemoPanel />
      <SmsPreview />
      <ToastStack />
    </>
  );
}
