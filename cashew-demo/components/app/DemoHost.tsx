'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { DemoPanel, type DemoAction } from '@/components/DemoPanel';
import { hasOpenDialog } from '@/components/DialogShell';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { api, refreshAll, useApi } from '@/lib/client/api';
import { useUi } from '@/lib/client/uiStore';
import { GuidedDemo } from '@/components/app/GuidedDemo';
import { useTour } from '@/lib/client/tourStore';
import { RUN_OF_SHOW } from '@/lib/demo/controls';

const SPEED_FACTOR = { '0.5x': 0.5, '1x': 1, '2x': 2, Instant: 0 } as const;
const SPEED_LABEL: Record<number, keyof typeof SPEED_FACTOR> = { 0.5: '0.5x', 1: '1x', 2: '2x', 0: 'Instant' };

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)));
};

// The presenter's layer: the D panel, its keyboard shortcuts and the presenter notes strip (Blueprint 10.4).
export function DemoHost() {
  const path = usePathname() ?? '';
  const router = useRouter();
  const toast = useToast();
  // The prototype and the kit page have their own ribbon text and panel, so this stays out of them.
  const active = !path.startsWith('/proto') && !path.startsWith('/kit');
  const { data: demo } = useApi<any>(active ? 'demo/state' : null, 1000);
  const setDemo = useUi((s) => s.setDemo);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const [step, setStep] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const lastReset = useRef<number>();
  const touring = useTour((s) => s.active);

  useEffect(() => {
    if (demo) setDemo({ speed: demo.speed, stagedLabels: demo.stagedLabels });
  }, [demo, setDemo]);

  const area = path.startsWith('/lender') ? '/lender' : path.startsWith('/ops') ? '/ops' : path.startsWith('/registry') ? '/registry' : path.startsWith('/app') ? '/app' : '/';

  // A reset from any tab leaves pages for trades that no longer exist, so go back to the area's home.
  useEffect(() => {
    if (!demo) return;
    if (lastReset.current !== undefined && lastReset.current !== demo.resetCount) {
      refreshAll();
      // The guided demo navigates for itself.
      if (!touring && path !== area && path !== '/app/m' && path !== '/app/passport') router.push(area);
    }
    lastReset.current = demo.resetCount;
  }, [demo, path, area, router, touring]);

  useEffect(() => {
    document.documentElement.style.setProperty('--caption-height', active && notes ? '28px' : '0px');
  }, [notes, active]);

  const say = useCallback((result: { ok?: boolean; message?: string }) => {
    if (result.message) toast(result.message, { tone: result.ok === false ? 'warn' : 'info' });
  }, [toast]);

  const advance = useCallback(async (what: string) => {
    const result = await api('demo/advance', { body: { what } });
    say(result);
    refreshAll();
    return result;
  }, [say]);

  const reset = useCallback(async () => {
    setConfirmReset(false);
    await api('demo/reset', { method: 'POST' });
    setStep(0);
    toast('Demo reset.', { tone: 'pass' });
    refreshAll();
  }, [toast]);

  const scenario = useCallback(async (id: 'A' | 'B' | 'C') => {
    await api('demo/scenario', { body: { id } });
    toast(`Scenario ${id} loaded.`, { tone: 'pass' });
    refreshAll();
  }, [toast]);

  const onAction = async (action: DemoAction) => {
    try {
      switch (action.type) {
        case 'scenario': return await scenario(action.scenario);
        case 'speed': await api('demo/speed', { body: { factor: SPEED_FACTOR[action.speed] } }); return refreshAll();
        case 'respond-now': return void (await advance('lenders-respond'));
        case 'buyer-confirms': return void (await advance('buyer-confirm'));
        case 'advance-shipment': return void (await advance('shipment'));
        case 'advance-30-days': return void (await advance('time-30d'));
        case 'advance-to-repayment': return void (await advance('repaid'));
        case 'duplicate-attempt': {
          await api('session', { body: { role: 'exporter' } });
          const result = await advance(`duplicate-${action.attempt}`);
          if (result.tradeId) router.push(`/app/trades/${result.tradeId}?tab=verification`);
          return;
        }
        case 'presenter-notes': return setNotes(action.on);
        case 'staged-labels': await api('demo/settings', { body: { stagedLabels: action.on } }); return refreshAll();
        case 'guided-demo': setOpen(false); return router.push('/demo');
        case 'reset': return await reset();
      }
    } catch (e) {
      toast((e as Error).message, { tone: 'warn' });
    }
  };

  const nextStep = useCallback(() => {
    setStep((current) => {
      const next = Math.min(current + 1, RUN_OF_SHOW.length - 1);
      const target = RUN_OF_SHOW[next];
      if (target.path) router.push(target.path);
      return next;
    });
  }, [router]);

  useEffect(() => {
    if (!active || touring) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || hasOpenDialog()) return;
      const key = event.key.toLowerCase();
      if (key === 'r') setConfirmReset(true);
      else if (key === 'n') nextStep();
      else if (key === 'g') router.push('/demo');
      else if (key === '1' || key === '2' || key === '3') void scenario((['A', 'B', 'C'] as const)[Number(key) - 1]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, touring, nextStep, scenario, router]);

  if (!active) return null;
  const current = RUN_OF_SHOW[step];

  return (
    <>
      <GuidedDemo />
      {notes && !touring && (
        <div role="note" aria-label="Presenter notes" className="fixed inset-x-0 top-ribbon z-40 flex h-7 items-center gap-2 overflow-hidden whitespace-nowrap border-b border-ink bg-accent px-4 text-table text-ink">
          <span className="tabular font-semibold">{current.time}</span>
          <span className="truncate">“{current.say}”</span>
          <span className="ml-auto hidden flex-none font-mono text-label lg:inline">Next: {current.action}. Press N.</span>
        </div>
      )}
      {!touring && <DemoPanel
        open={open}
        onOpenChange={setOpen}
        onAction={onAction}
        values={demo ? { scenario: demo.scenario, speed: SPEED_LABEL[demo.speed] ?? '1x', notes, staged: demo.stagedLabels } : undefined}
      />}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset the demo?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => void reset()}>Reset demo</Button>
          </>
        }
      >
        <p>This restores the seed data for the current scenario. Trades made during this run are removed.</p>
      </Modal>
    </>
  );
}
