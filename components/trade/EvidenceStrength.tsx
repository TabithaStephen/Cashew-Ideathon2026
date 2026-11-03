import { ShieldAlert } from 'lucide-react';
import { StatusChip } from '@/components/StatusChip';
import { COMPONENTS } from '@/lib/engines/risk';
import type { RiskProfile } from '@/lib/types';
import { cn } from '@/lib/cn';

export const bandVariant = (b?: string) => (b === 'Strong' ? 'pass' : b === 'Moderate' ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail';

/** Evidence strength summary (never called a "score"). */
export function EvidenceStrength({ risk, compact }: { risk: RiskProfile; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-end gap-3">
        <p className="font-display text-[40px] leading-none tabular">{risk.strength.toFixed(1)}</p>
        <div className="pb-1 space-y-1"><StatusChip variant={bandVariant(risk.band)} label={`${risk.band} evidence`} /><p className="text-caption text-ink-3">Risk band: {risk.riskBand}</p></div>
      </div>
      {risk.blocking.length > 0 && (
        <p className="mt-3 text-table text-danger bg-danger-soft rounded-btn px-3 py-2 flex items-center gap-2"><ShieldAlert size={16} /> Blocking issue on check {risk.blocking.join(', ')}. Band capped at Limited.</p>
      )}
      {!compact && (
        <div className="mt-4 space-y-2.5">
          {COMPONENTS.map((c) => {
            const v = risk.components[c.key], pct = (v / c.max) * 100;
            return (
              <div key={c.key}>
                <div className="flex justify-between text-caption"><span className="text-ink-2">{c.label}</span><span className="tabular text-ink-3">{v} / {c.max}</span></div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden mt-1"><div className={cn('h-full rounded-full transition-all duration-base', pct >= 80 ? 'bg-success' : pct >= 60 ? 'bg-warn' : 'bg-danger')} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-caption text-ink-3 mt-3">Rules {risk.ruleVersion}. Unknown and pending count at 40%, never as a pass.</p>
    </div>
  );
}
