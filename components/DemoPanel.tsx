'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, Gauge, PackageCheck, RotateCcw, Ship, Timer, Users, X, Copy, BadgeCheck, StickyNote, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, useApi } from '@/lib/client';
import { cn } from '@/lib/cn';
import { useUI } from '@/lib/ui-store';
import { homeFor, useMe } from '@/lib/session';
import { SHIPMENT_STAGES } from '@/lib/types';
import { Button } from './Button';

interface DemoState { scenario: 'A' | 'B' | 'C'; speed: number; focusTradeId: string | null; focusStatus: string | null; registryCount: number }

export function useDemoActions() {
  const router = useRouter();
  const { toast, setSpeed } = useUI();
  const me = useMe();
  const goHome = async () => {
    const fresh = await fetch('/api/orgs/me', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    router.push(homeFor(fresh?.session?.role ?? me.data?.session?.role));
  };
  return {
    async scenario(id: 'A' | 'B' | 'C') {
      const r = await api<{ ms: number }>('/api/demo/scenario', { json: { id } });
      useUI.getState().setSms(null);
      toast({ tone: 'info', text: `Scenario ${id} loaded in ${r.ms} ms.` });
      if (location.pathname !== '/') goHome();
      router.refresh();
    },
    async reset() {
      const r = await api<{ ms: number; scenario: string }>('/api/demo/reset', { json: {} });
      useUI.getState().setSms(null);
      toast({ tone: 'info', text: `Demo reset to Scenario ${r.scenario} in ${r.ms} ms.` });
      if (location.pathname !== '/') goHome();
      router.refresh();
    },
    async speed(f: number) { await api('/api/demo/speed', { json: { factor: f } }); setSpeed(f); },
    async advance(what: string) {
      const r = await api<{ message: string; tradeId?: string; smeId?: string }>('/api/demo/advance', { json: { what } });
      toast({ tone: 'info', text: r.message });
      const fresh = await fetch('/api/orgs/me', { cache: 'no-store' }).then((x) => x.json()).catch(() => null) as { session?: { role: string; orgId: string } } | null;
      const sess = fresh?.session;
      if (what.startsWith('duplicate') && r.tradeId) {
        const role = sess?.role;
        if (role === 'exporter' && sess?.orgId === 'org_cks') router.push(`/app/trades/${r.tradeId}?tab=verification`);
        else if (role === 'ops') router.push(`/ops`);
      }
      if (what === 'repaid' && r.smeId && sess?.role === 'exporter') {
        if (sess.orgId !== r.smeId) await api('/api/session', { json: { role: 'exporter', orgId: r.smeId } });
        router.push('/app/passport');
      }
      return r;
    },
  };
}

const SPEEDS: [number, string][] = [[0.5, '0.5x'], [1, '1x'], [2, '2x'], [0, 'Instant']];

/** DemoPanel (5.4 #13, 10.4): floating bottom-left, 320px, toggled with D. */
export function DemoPanel() {
  const { demoPanelOpen, setDemoPanel, presenterNotes, setPresenterNotes, showStagedLabels, setShowStagedLabels, speed } = useUI();
  const { data, refresh } = useApi<DemoState>(demoPanelOpen ? '/api/demo/state' : null, 1500);
  const ws = useApi<{ trade: { shipmentStage?: number } }>(demoPanelOpen && data?.focusTradeId ? `/api/trades/${data.focusTradeId}` : null);
  const act = useDemoActions();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, fn: () => Promise<unknown>) => async () => { setBusy(key); try { await fn(); } catch { /* toast already shown */ } finally { setBusy(null); refresh(); } };
  const stage = ws.data?.trade?.shipmentStage ?? 0;
  const sp = data?.speed ?? speed;

  return (
    <AnimatePresence>
      {demoPanelOpen && (
        <motion.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="fixed bottom-4 left-4 z-[85] w-[320px] max-h-[calc(100vh-5rem)] overflow-y-auto bg-surface border border-line rounded-card shadow-md" aria-label="Demo controls">
          <div className="flex items-center justify-between px-4 h-11 border-b border-line sticky top-0 bg-surface z-10">
            <p className="text-sm font-semibold">Demo controls</p>
            <div className="flex items-center gap-2">
              <span className="text-caption text-ink-3">{data?.focusTradeId ?? 'No active trade'}</span>
              <button onClick={() => setDemoPanel(false)} aria-label="Close demo controls" className="p-1 rounded-btn text-ink-3 hover:text-ink hover:bg-canvas"><X size={16} /></button>
            </div>
          </div>
          <div className="p-4 space-y-4 text-sm">
            <Row label="Scenario" icon={<Copy size={14} />}>
              <Seg options={(['A', 'B', 'C'] as const).map((x) => [x, x])} value={data?.scenario} onPick={(v) => run('scn', () => act.scenario(v as 'A' | 'B' | 'C'))()} busy={busy === 'scn'} />
            </Row>
            <Row label="Speed" icon={<Gauge size={14} />}>
              <Seg options={SPEEDS.map(([v, l]) => [String(v), l])} value={String(sp)} onPick={(v) => run('spd', () => act.speed(Number(v)))()} />
            </Row>
            <Grid>
              <Ctl icon={<Users size={14} />} label="Respond now" hint="Lender responses" onClick={run('lr', () => act.advance('lenders-respond'))} busy={busy === 'lr'} />
              <Ctl icon={<BadgeCheck size={14} />} label="Buyer confirms" hint="Check 14 → pass" onClick={run('bc', () => act.advance('buyer-confirm'))} busy={busy === 'bc'} />
              <Ctl icon={<Ship size={14} />} label="Advance shipment" hint={`Now: ${SHIPMENT_STAGES[stage]}${stage < 4 ? ` → ${SHIPMENT_STAGES[stage + 1]}` : ''}`} onClick={run('sh', () => act.advance('shipment'))} busy={busy === 'sh'} />
              <Ctl icon={<Timer size={14} />} label="Advance 30 days" hint="Demo clock" onClick={run('t30', () => act.advance('time-30d'))} busy={busy === 't30'} />
              <Ctl icon={<FastForward size={14} />} label="Advance to repayment" hint="REPAID, Passport" onClick={run('rp', () => act.advance('repaid'))} busy={busy === 'rp'} />
              <Ctl icon={<PackageCheck size={14} />} label="Duplicate attempt 1" hint="Exact copy" onClick={run('d1', () => act.advance('duplicate-1'))} busy={busy === 'd1'} />
              <Ctl icon={<PackageCheck size={14} />} label="Duplicate attempt 2" hint="Altered copy" onClick={run('d2', () => act.advance('duplicate-2'))} busy={busy === 'd2'} />
            </Grid>
            <div className="space-y-2 pt-1">
              <Toggle icon={<StickyNote size={14} />} label="Presenter notes" checked={presenterNotes} onChange={setPresenterNotes} />
              <Toggle icon={<Eye size={14} />} label="Show staged labels" checked={showStagedLabels} onChange={(v) => { setShowStagedLabels(v); }} hint={!showStagedLabels ? 'Off: for recorded video only, never a live room' : undefined} />
            </div>
            <Button variant="secondary" className="w-full" icon={<RotateCcw size={16} />} loading={busy === 'reset'} onClick={run('reset', act.reset)}>Reset demo</Button>
            <p className="text-caption text-ink-3">Keys: D panel · R reset · N next note · 1 2 3 scenario · Esc close</p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Row({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><p className="text-caption text-ink-3 mb-1.5 flex items-center gap-1.5">{icon}{label}</p>{children}</div>;
}
function Seg({ options, value, onPick, busy }: { options: [string, string][]; value?: string; onPick: (v: string) => void; busy?: boolean }) {
  return (
    <div className="flex rounded-btn border border-line p-0.5 bg-canvas" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} disabled={busy} onClick={() => onPick(v)}
          className={cn('flex-1 h-8 rounded-[8px] text-[13px] font-medium transition-colors duration-fast', value === v ? 'bg-surface shadow-sm text-brand' : 'text-ink-2 hover:text-ink')}>{l}</button>
      ))}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-2">{children}</div>; }
function Ctl({ icon, label, hint, onClick, busy }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className="text-left rounded-btn border border-line px-2.5 py-2 hover:border-brand/40 hover:bg-brand-soft/40 transition-colors duration-fast disabled:opacity-60">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">{icon}{label}</span>
      <span className="block text-[11px] text-ink-3 mt-0.5 truncate">{busy ? 'Working…' : hint}</span>
    </button>
  );
}
function Toggle({ icon, label, checked, onChange, hint }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="w-full flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px]">{icon}{label}</span>
        <span className={cn('w-9 h-5 rounded-full relative transition-colors duration-fast', checked ? 'bg-brand' : 'bg-line')}>
          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-fast', checked ? 'left-[18px]' : 'left-0.5')} />
        </span>
      </button>
      {hint && <p className="text-[11px] text-warn mt-1">{hint}</p>}
    </div>
  );
}
