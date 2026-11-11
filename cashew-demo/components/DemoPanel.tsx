'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { hasOpenDialog } from './DialogShell';

export type DemoAction =
  | { type: 'scenario'; scenario: 'A' | 'B' | 'C' }
  | { type: 'speed'; speed: '0.5x' | '1x' | '2x' | 'Instant' }
  | { type: 'respond-now' }
  | { type: 'buyer-confirms' }
  | { type: 'advance-shipment' }
  | { type: 'advance-30-days' }
  | { type: 'advance-to-repayment' }
  | { type: 'duplicate-attempt'; attempt: 1 | 2 }
  | { type: 'presenter-notes'; on: boolean }
  | { type: 'staged-labels'; on: boolean }
  | { type: 'guided-demo' }
  | { type: 'reset' };

const SCENARIOS = ['A', 'B', 'C'] as const;
const SPEEDS = ['0.5x', '1x', '2x', 'Instant'] as const;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule px-3 py-2">
      <p className="field-label mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Pick({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn('h-9 min-w-11 rounded-control border px-2 text-table transition-colors duration-fast', pressed ? 'border-ink bg-ink text-sheet' : 'border-rule bg-sheet hover:border-ink')}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-table">
      {children}
      <span className={cn('flex-none rounded-control border px-1.5 font-mono text-label', on ? 'border-ink bg-ink text-sheet' : 'border-ink-3 text-ink-2')}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)));
}

export interface DemoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Phase 9 connects these to lib/demo/controls.ts. */
  onAction?: (action: DemoAction) => void;
  /** Current values from the server. Left out, the panel keeps its own (the kit page). */
  values?: { scenario: 'A' | 'B' | 'C'; speed: (typeof SPEEDS)[number]; notes: boolean; staged: boolean };
}

export function DemoPanel({ open, onOpenChange, onAction, values }: DemoPanelProps) {
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>('B');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>('1x');
  const [notes, setNotes] = useState(false);
  const [staged, setStaged] = useState(true);
  useEffect(() => {
    if (!values) return;
    setScenario(values.scenario);
    setSpeed(values.speed);
    setNotes(values.notes);
    setStaged(values.staged);
  }, [values?.scenario, values?.speed, values?.notes, values?.staged]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const change = useRef(onOpenChange);
  change.current = onOpenChange;
  const isOpen = useRef(open);
  isOpen.current = open;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isOpen.current && !hasOpenDialog()) change.current(false);
        return;
      }
      if (event.key.toLowerCase() !== 'd' || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      change.current(!isOpen.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Not modal: the app stays usable behind it, but keyboard users land on it and return afterwards.
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      closeBtn.current?.focus();
    } else if (opener.current) {
      if (opener.current.isConnected) opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  if (!open) return null;
  const act = (action: DemoAction) => onAction?.(action);

  return (
    <section
      aria-label="Demo controls"
      data-above-scrim
      className="fixed bottom-4 left-4 z-[70] max-h-[calc(100dvh-var(--ribbon-height)-32px)] w-[min(320px,calc(100vw-32px))] overflow-y-auto border-2 border-ink bg-sheet"
    >
      <header className="flex items-center justify-between py-0.5 pl-3 pr-0.5">
        <h2 className="text-table font-semibold">Demo controls</h2>
        <button ref={closeBtn} type="button" aria-label="Close demo controls" onClick={() => onOpenChange(false)} className="grid size-11 place-items-center rounded-control hover:bg-paper">
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <Group title="Scenario">
        {SCENARIOS.map((value) => (
          <Pick key={value} pressed={scenario === value} onClick={() => { setScenario(value); act({ type: 'scenario', scenario: value }); }}>
            {value}
          </Pick>
        ))}
      </Group>
      <Group title="Speed">
        {SPEEDS.map((value) => (
          <Pick key={value} pressed={speed === value} onClick={() => { setSpeed(value); act({ type: 'speed', speed: value }); }}>
            {value}
          </Pick>
        ))}
      </Group>
      {/* One group, so the whole panel fits a 1280x800 projector without scrolling. */}
      <Group title="Trade events">
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'respond-now' })}>Lenders respond now</Button>
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'buyer-confirms' })}>Buyer confirms</Button>
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'advance-shipment' })}>Advance shipment</Button>
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'advance-30-days' })}>Advance 30 days</Button>
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'advance-to-repayment' })}>Advance to repayment</Button>
      </Group>
      <Group title="Registry">
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'duplicate-attempt', attempt: 1 })}>Add duplicate attempt 1</Button>
        <Button size="compact" className="max-md:h-9" onClick={() => act({ type: 'duplicate-attempt', attempt: 2 })}>Add duplicate attempt 2</Button>
      </Group>
      <div className="border-t border-rule px-3 py-1">
        <Toggle on={notes} onClick={() => { setNotes(!notes); act({ type: 'presenter-notes', on: !notes }); }}>Presenter notes</Toggle>
        <Toggle on={staged} onClick={() => { setStaged(!staged); act({ type: 'staged-labels', on: !staged }); }}>Show staged labels</Toggle>
      </div>
      <div className="flex flex-col gap-2 border-t border-rule p-3">
        <Button variant="primary" size="compact" className="w-full max-md:h-9" onClick={() => act({ type: 'guided-demo' })}>Start guided demo</Button>
        <Button variant="danger" size="compact" className="w-full max-md:h-9" onClick={() => act({ type: 'reset' })}>Reset demo</Button>
      </div>
    </section>
  );
}
