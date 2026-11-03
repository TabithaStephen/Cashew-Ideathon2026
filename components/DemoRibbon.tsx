'use client';
import { useUI } from '@/lib/ui-store';
import { RUN_OF_SHOW } from '@/lib/demo/script';

/** DemoRibbon (5.4 #12): always visible. Optional presenter-notes caption underneath. */
export function DemoRibbon() {
  const { presenterNotes, presenterStep } = useUI();
  const step = RUN_OF_SHOW[presenterStep];
  return (
    <div className="fixed top-0 inset-x-0 z-[90]">
      <div className="h-ribbon bg-accent-soft border-b border-accent/20 flex items-center justify-center px-4">
        <p className="text-caption text-ink font-medium tracking-wide truncate">DEMO ENVIRONMENT. External data sources are simulated. Press D for demo controls.</p>
      </div>
      {presenterNotes && step && (
        <div className="bg-ink text-white/95 text-caption px-4 py-1.5 flex items-center gap-3 justify-center" aria-live="polite">
          <span className="font-mono text-accent">{step.time}</span>
          <span className="text-white/60">{step.screen}</span>
          <span className="truncate">“{step.say}”</span>
          {step.claim && <span className="rounded-full bg-white/10 px-2">Claim {step.claim}</span>}
          <span className="text-white/50">N for next</span>
        </div>
      )}
    </div>
  );
}
