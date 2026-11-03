'use client';
import { ArrowRight, Building2, ClipboardCheck, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useMe } from '@/lib/session';
import { CashewMark } from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useDemoActions } from '@/components/DemoPanel';
import type { Role } from '@/lib/types';

const LENDERS = [['lender_banyan', 'Banyan Capital'], ['lender_tidewater', 'Tidewater Finance'], ['lender_meridian', 'Meridian Bank']] as const;

export default function Landing() {
  const router = useRouter();
  const me = useMe();
  const act = useDemoActions();
  const [lender, setLender] = useState<string>('lender_banyan');
  const [busy, setBusy] = useState<Role | null>(null);
  const exporterId = me.data?.scenarioExporter ?? 'org_kaveri';
  const exporterName = me.data?.orgs.find((o) => o.id === exporterId)?.shortName ?? 'Kaveri Textiles';

  const go = async (role: Role, orgId: string, href: string) => {
    setBusy(role);
    try { await api('/api/session', { json: { role, orgId } }); router.push(href); } catch { setBusy(null); }
  };

  return (
    <main className="min-h-[calc(100vh-24px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[960px]">
        <div className="bg-surface border border-line rounded-card shadow-sm px-6 sm:px-12 py-12 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <CashewMark size={36} />
            <span className="font-display text-[26px] font-semibold tracking-tight">Cashew</span>
          </div>
          <h1 className="text-h1">One verified trade. Many lenders.</h1>
          <p className="text-ink-2 mt-2 max-w-[560px] mx-auto">Export finance for Indian MSME exporters. Verify once, compare sealed offers honestly, and stop the same invoice being financed twice.</p>

          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            <RoleCard icon={<Building2 size={22} strokeWidth={1.75} />} title="Exporter" who={exporterName} desc="Upload documents, run 14 checks, compare offers, get funded."
              onClick={() => go('exporter', exporterId, '/app')} busy={busy === 'exporter'} />
            <RoleCard icon={<Landmark size={22} strokeWidth={1.75} />} title="Lender" who={LENDERS.find((l) => l[0] === lender)![1]} desc="Review verified evidence, weigh it your way, send a sealed offer."
              onClick={() => go('lender', lender, '/lender')} busy={busy === 'lender'}
              extra={
                <div className="flex gap-1 mt-3" role="radiogroup" aria-label="Choose lender">
                  {LENDERS.map(([id, name]) => (
                    <button key={id} role="radio" aria-checked={lender === id} onClick={(e) => { e.stopPropagation(); setLender(id); }}
                      className={cn('text-[11px] px-2 h-6 rounded-full border transition-colors duration-fast', lender === id ? 'bg-brand text-white border-brand' : 'border-line text-ink-2 hover:border-brand/40')}>
                      {name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              } />
            <RoleCard icon={<ClipboardCheck size={22} strokeWidth={1.75} />} title="Ops" who="Asha (Cashew Ops)" desc="Review flagged cases, the registry and the audit log."
              onClick={() => go('ops', 'org_cashew', '/ops')} busy={busy === 'ops'} />
          </div>
          <p className="text-caption text-ink-3 mt-8">No passwords in the demo.</p>
        </div>
        <div className="text-center mt-4">
          <button onClick={() => act.reset().catch(() => {})} className="text-caption text-ink-3 hover:text-brand underline underline-offset-2">Reset demo</button>
        </div>
      </div>
    </main>
  );
}

function RoleCard({ icon, title, who, desc, onClick, busy, extra }: { icon: React.ReactNode; title: string; who: string; desc: string; onClick: () => void; busy?: boolean; extra?: React.ReactNode }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="group rounded-card border border-line bg-surface p-6 cursor-pointer transition-all duration-base hover:border-brand/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand">
      <div className="w-11 h-11 rounded-btn bg-brand-soft text-brand flex items-center justify-center">{icon}</div>
      <p className="font-display text-h3 mt-4">{title}</p>
      <p className="text-sm font-semibold text-brand">{who}</p>
      <p className="text-table text-ink-2 mt-2 min-h-[40px]">{desc}</p>
      {extra}
      <p className="text-sm font-medium text-ink mt-4 flex items-center gap-1 group-hover:text-brand">{busy ? 'Opening…' : 'Continue'} <ArrowRight size={16} className="transition-transform duration-fast group-hover:translate-x-0.5" /></p>
    </div>
  );
}
