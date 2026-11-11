'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Logo } from '@/components/app/AppShell';
import { api, refreshAll, useApi } from '@/lib/client/api';
import { useTour } from '@/lib/client/tourStore';
import { useUi } from '@/lib/client/uiStore';
import { CHAPTERS, TOUR } from '@/lib/demo/tour';
import { cn } from '@/lib/utils';

const BLURB: Record<string, string> = {
  'Verify once': 'Documents go in, fourteen checks run, and a real mismatch gets caught and fixed.',
  'Many lenders': 'One consent, sealed offers, one comparable cost, and a hidden fee exposed.',
  'The transaction': 'Accept, sign, registry, money to the exporter, shipment, buyer payment, and settlement, with the real amounts at each step.',
  'Trade Passport': 'A signed record that any lender can verify, and that breaks if one number changes.',
  'Double financing': 'An exact copy and a tweaked copy of an invoice, both stopped without naming the other lender.',
  'The end': 'The story in one line.',
};
const SPEEDS: Array<[number, string]> = [[1, 'Normal'], [2, 'Fast']];

export default function DemoStart() {
  const start = useTour((s) => s.start);
  const active = useTour((s) => s.active);
  const speed = useUi((s) => s.speed);
  useApi('demo/state', 1000);
  const setSpeed = async (factor: number) => {
    await api('demo/speed', { body: { factor } });
    refreshAll();
  };
  return (
    <main className="mx-auto flex max-w-[840px] flex-col gap-6 px-4 py-8">
      <div className="panel p-6 md:p-8">
        <p className="flex items-center gap-2 font-bold"><Logo /> Cashew</p>
        <h1 className="mt-4 text-display">Guided demo</h1>
        <p className="mt-2 max-w-[68ch] text-ink-2">Cashew plays itself on the real screens, pressing the real buttons and explaining each step. You can pause at any point. It takes about 5 minutes at normal speed.</p>
        <ol className="mt-5 border-t border-rule">
          {CHAPTERS.map((chapter, i) => (
            <li key={chapter} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 border-b border-rule py-2">
              <span className="tabular font-mono text-label text-ink-3">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className={cn('font-semibold', chapter === 'The transaction' && 'bg-accent px-1')}>{chapter}</span>
                <span className="block text-table text-ink-2">{BLURB[chapter]} ({TOUR.filter((s) => s.chapter === chapter).length} {TOUR.filter((s) => s.chapter === chapter).length === 1 ? 'step' : 'steps'})</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={active} onClick={start}><Play size={18} strokeWidth={2} aria-hidden="true" /> Start the demo</Button>
          <div role="group" aria-label="Speed" className="flex items-center gap-1">
            <span className="field-label mr-1">Speed</span>
            {SPEEDS.map(([factor, label]) => (
              <button key={factor} type="button" aria-pressed={speed === factor} onClick={() => setSpeed(factor)} className={cn('h-11 rounded-control border px-3 text-table', speed === factor ? 'border-ink bg-ink text-sheet' : 'border-rule bg-sheet hover:border-ink')}>{label}</button>
            ))}
          </div>
          <Link href="/" className="flex min-h-11 items-center underline underline-offset-4">Explore on my own instead</Link>
        </div>
        <p className="mt-4 text-table text-ink-2">Starting resets the demo data. Everyone and everything is fictional, and no real money moves. Press P to pause and the right arrow for the next step. Clicks on the page are paused while it plays, and scrolling still works. Refreshing the page ends the guided demo.</p>
      </div>
    </main>
  );
}
