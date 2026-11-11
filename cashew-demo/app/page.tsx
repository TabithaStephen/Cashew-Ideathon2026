'use client';

import { Building2, Landmark, ShieldCheck, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/app/AppShell';
import { useToast } from '@/components/Toast';
import { api, refreshAll, useApi } from '@/lib/client/api';
import { LENDER_ORGS } from '@/lib/seed/lenders';

function RoleCard({ icon: Icon, role, name, onPick }: { icon: LucideIcon; role: string; name: string; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="flex min-h-36 w-full flex-col items-start gap-3 border border-ink bg-sheet p-4 text-left transition-colors duration-fast hover:bg-accent">
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      <span>
        <span className="block text-h2">{role}</span>
        <span className="block text-ink-2">{name}</span>
      </span>
    </button>
  );
}

// Landing and role picker (Blueprint 7.1). A role is only a cookie: there are no passwords.
export default function Landing() {
  const router = useRouter();
  const toast = useToast();
  const [lender, setLender] = useState(LENDER_ORGS[0].id);
  const { data: demo } = useApi<any>('demo/state', 2000);
  const pick = async (role: string, href: string, lenderId?: string) => {
    try {
      await api('session', { body: { role, lenderId } });
      refreshAll();
      router.push(href);
    } catch (e) {
      toast((e as Error).message, { tone: 'fail' });
    }
  };
  const reset = async () => {
    await api('demo/reset', { method: 'POST' });
    refreshAll();
    toast('Demo reset.', { tone: 'pass' });
  };
  return (
    <main className="mx-auto flex min-h-[calc(100vh-var(--ribbon-height)-var(--caption-height))] max-w-[840px] flex-col justify-center px-4 py-8">
      <div className="panel p-6 md:p-8">
        <p className="flex items-center gap-2 font-bold"><Logo /> Cashew</p>
        <h1 className="mt-4 text-display">One verified trade. Many lenders.</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <RoleCard icon={Building2} role="Exporter" name={demo?.scenario === 'C' ? 'Coimbatore Knit Studio' : 'Kaveri Textiles'} onPick={() => pick('exporter', '/app')} />
          <div className="flex flex-col gap-2">
            <RoleCard icon={Landmark} role="Lender" name={LENDER_ORGS.find((l) => l.id === lender)!.legalName} onPick={() => pick('lender', '/lender', lender)} />
            <label>
              <span className="sr-only">Choose a lender</span>
              <select className="input" value={lender} onChange={(e) => setLender(e.target.value)}>
                {LENDER_ORGS.map((l) => <option key={l.id} value={l.id}>{l.legalName}</option>)}
              </select>
            </label>
          </div>
          <RoleCard icon={ShieldCheck} role="Ops" name="Asha" onPick={() => pick('ops', '/ops')} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-table text-ink-2">
          <p>No passwords in the demo.</p>
          <span className="flex flex-wrap items-center gap-4">
            <Link href="/demo" className="flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">Watch the guided demo</Link>
            <button type="button" onClick={reset} className="min-h-11 underline underline-offset-4">Reset demo</button>
          </span>
        </div>
      </div>
    </main>
  );
}
