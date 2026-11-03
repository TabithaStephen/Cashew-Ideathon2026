'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Camera, CheckCircle2, Home, PackageCheck, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { CashewMark } from '@/components/EmptyState';
import { Timeline } from '@/components/Timeline';
import { api, useApi } from '@/lib/client';
import type { TradeRowT, Workspace } from '@/lib/client-types';
import { cn } from '@/lib/cn';
import { ago, exportValue, inr } from '@/lib/format';
import { useUI } from '@/lib/ui-store';

type Lang = 'en' | 'hi';
const S = {
  home: { en: 'Home', hi: 'होम' },
  capture: { en: 'Capture', hi: 'फ़ोटो लें' },
  alerts: { en: 'Alerts', hi: 'सूचनाएँ' },
  nextStep: { en: 'Next step', hi: 'अगला कदम' },
  currentTrade: { en: 'Current trade', hi: 'मौजूदा व्यापार' },
  goodsDelivered: { en: 'Goods delivered', hi: 'माल पहुँच गया' },
  confirmDelivery: { en: 'Tap when your buyer receives the goods', hi: 'खरीदार को माल मिलने पर टैप करें' },
  delivered: { en: 'Delivery confirmed', hi: 'डिलीवरी की पुष्टि हो गई' },
  useSample: { en: 'Use sample photo', hi: 'नमूना फ़ोटो इस्तेमाल करें' },
  pointCamera: { en: 'Point the camera at an invoice', hi: 'कैमरा इनवॉइस की ओर करें' },
  detected: { en: 'Document edges detected', hi: 'दस्तावेज़ के किनारे मिल गए' },
  noAlerts: { en: 'No alerts yet', hi: 'अभी कोई सूचना नहीं' },
  noTrade: { en: 'No active trade', hi: 'कोई सक्रिय व्यापार नहीं' },
  milestone: { en: 'Milestone request', hi: 'माइलस्टोन अनुरोध' },
} as const;
const STEPS = { en: ['Submitted', 'Verified', 'Offers', 'Financed', 'Shipped', 'Delivered', 'Repaid'], hi: ['जमा', 'सत्यापित', 'ऑफ़र', 'वित्तपोषित', 'भेजा', 'पहुँचा', 'चुकाया'] };

export default function MobileView() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<'home' | 'capture' | 'alerts'>('home');
  const t = (k: keyof typeof S) => S[k][lang];
  const trades = useApi<TradeRowT[]>('/api/trades', 1000);
  const active = trades.data?.find((r) => !r.historical && !['REPAID', 'CLOSED', 'WITHDRAWN'].includes(r.status)) ?? trades.data?.find((r) => !r.historical);
  const ws = useApi<Workspace>(active ? `/api/trades/${active.id}` : null, 1000);
  const notes = useApi<{ items: { id: number; text: string; tone: string; createdAt: string; kind: string }[] }>('/api/notifications?after=0', 1000);

  return (
    <div className="flex flex-col xl:flex-row items-center justify-center gap-10 py-4">
      <div className="max-w-[300px] order-2 xl:order-1">
        <h2>Mobile view</h2>
        <p className="text-sm text-ink-2 mt-2">The same exporter app on a phone. It uses the same store and API as the desktop, polling every second, so a tap here shows up on the desktop within a second.</p>
        <ul className="text-table text-ink-2 mt-4 space-y-1.5 list-disc pl-5">
          <li>Home: next action and the trade timeline</li><li>Capture: camera-style document capture</li><li>Alerts: offers and milestone requests</li><li>One-tap “Goods delivered” confirmation</li><li>English / हिन्दी toggle</li>
        </ul>
      </div>
      <div className="order-1 xl:order-2 rounded-[52px] bg-ink p-3 shadow-md shrink-0" style={{ width: 390 + 24, height: 844 + 24 }}>
        <div className="relative w-[390px] h-[844px] rounded-[42px] bg-canvas overflow-hidden flex flex-col">
          <div className="h-11 flex items-center justify-between px-7 text-[13px] font-semibold"><span>9:41</span><span className="w-24 h-6 rounded-full bg-ink absolute left-1/2 -translate-x-1/2 top-2" /><span>5G</span></div>
          <div className="px-5 h-14 flex items-center justify-between border-b border-line bg-surface">
            <span className="flex items-center gap-2"><CashewMark size={22} /><span className="font-display text-[18px] font-semibold">Cashew</span></span>
            <div className="flex rounded-full border border-line p-0.5 text-[12px]" role="radiogroup" aria-label="Language">
              {(['en', 'hi'] as const).map((l) => <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)} className={cn('px-2.5 h-6 rounded-full', lang === l ? 'bg-brand text-white' : 'text-ink-2')}>{l === 'en' ? 'English' : 'हिन्दी'}</button>)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'home' && <HomeTab ws={ws.data} active={active} t={t} lang={lang} />}
            {tab === 'capture' && <CaptureTab t={t} />}
            {tab === 'alerts' && <AlertsTab items={[...(notes.data?.items ?? [])].reverse().slice(0, 10)} t={t} ws={ws.data} />}
          </div>
          <nav className="h-[76px] border-t border-line bg-surface grid grid-cols-3 pb-4">
            {([['home', Home], ['capture', Camera], ['alerts', Bell]] as const).map(([k, I]) => (
              <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={cn('flex flex-col items-center justify-center gap-0.5 text-[11px]', tab === k ? 'text-brand font-semibold' : 'text-ink-3')}><I size={20} strokeWidth={1.75} />{t(k)}</button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function DeliveredButton({ ws, t }: { ws: Workspace; t: (k: keyof typeof S) => string }) {
  const [busy, setBusy] = useState(false);
  const stage = ws.trade.shipmentStage ?? 0;
  if (!ws.trade.disbursedAt) return null;
  const done = stage >= 4;
  return (
    <div className="bg-surface border border-line rounded-card p-4">
      <p className="text-caption text-ink-3">{t('milestone')}</p>
      <p className="text-sm mt-0.5">{done ? t('delivered') : t('confirmDelivery')}</p>
      <button disabled={done || busy} onClick={async () => { setBusy(true); try { await api(`/api/trades/${ws.trade.id}/milestone`, { json: { stage: 4 } }); useUI.getState().toast({ tone: 'success', text: 'Delivery confirmed from the phone.' }); } finally { setBusy(false); } }}
        className={cn('mt-3 w-full h-14 rounded-btn text-[16px] font-semibold flex items-center justify-center gap-2 transition-colors', done ? 'bg-success-soft text-success' : 'bg-brand text-white active:scale-[0.99]')}>
        {done ? <CheckCircle2 size={20} /> : <PackageCheck size={20} />}{t('goodsDelivered')}
      </button>
    </div>
  );
}

function HomeTab({ ws, active, t, lang }: { ws?: Workspace; active?: TradeRowT; t: (k: keyof typeof S) => string; lang: Lang }) {
  if (!ws || !active) return <p className="text-sm text-ink-3 text-center mt-20">{t('noTrade')}</p>;
  return (
    <div className="space-y-3">
      {ws.nextAction && <div className="bg-brand text-white rounded-card p-4"><p className="text-caption text-white/70">{t('nextStep')}</p><p className="font-display text-h3 text-white">{ws.nextAction.title}</p><p className="text-table text-white/80 mt-0.5">{ws.nextAction.body}</p></div>}
      <DeliveredButton ws={ws} t={t} />
      <div className="bg-surface border border-line rounded-card p-4">
        <p className="text-caption text-ink-3">{t('currentTrade')}</p>
        <p className="text-sm font-semibold mt-0.5">{ws.buyer.name}</p>
        <p className="text-caption text-ink-2 tabular">{exportValue(ws.trade.value, ws.trade.fx)}</p>
        {ws.accepted && <p className="text-caption text-ink-2 mt-1">{ws.accepted.lender} · {inr(ws.accepted.maths!.netCash)}</p>}
        <div className="mt-4"><Timeline orientation="vertical" steps={STEPS[lang]} current={ws.trade.timelineIndex} /></div>
      </div>
    </div>
  );
}

function CaptureTab({ t }: { t: (k: keyof typeof S) => string }) {
  const [state, setState] = useState<'idle' | 'detecting' | 'done'>('idle');
  return (
    <div className="space-y-3">
      <div className="relative h-[480px] rounded-card bg-ink overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 40%, rgb(var(--c-ink-3)), transparent 70%)' }} />
        <AnimatePresence>
          {state !== 'idle' && (
            <motion.div initial={{ opacity: 0, rotate: -4, scale: 0.9 }} animate={{ opacity: 1, rotate: -2, scale: 1 }} className="relative w-[220px] h-[300px] bg-surface rounded-sm p-4 space-y-1.5">
              <div className="h-2.5 w-24 bg-ink/40 rounded" /><div className="h-1.5 w-16 bg-accent/50 rounded mb-3" />
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-1 bg-line rounded" style={{ width: `${45 + ((i * 29) % 50)}%` }} />)}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className="absolute border-2 border-accent rounded-md" style={{ width: 236, height: 316 }}
          animate={state === 'detecting' ? { opacity: [0.3, 1, 0.3], scale: [1.08, 1, 1.03] } : state === 'done' ? { opacity: 1, scale: 1 } : { opacity: 0.4, scale: 1.1 }}
          transition={state === 'detecting' ? { duration: 1.2, repeat: 1 } : { duration: 0.2 }} />
        {state === 'idle' && <p className="absolute bottom-6 text-white/80 text-sm flex items-center gap-2"><ScanLine size={16} />{t('pointCamera')}</p>}
        {state === 'done' && <p className="absolute bottom-6 text-white text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-success" />{t('detected')}</p>}
      </div>
      <button onClick={() => { setState('detecting'); setTimeout(() => setState('done'), 2400); }} className="w-full h-12 rounded-btn bg-brand text-white font-semibold">{t('useSample')}</button>
    </div>
  );
}

function AlertsTab({ items, t, ws }: { items: { id: number; text: string; tone: string; createdAt: string; kind: string }[]; t: (k: keyof typeof S) => string; ws?: Workspace }) {
  return (
    <div className="space-y-2.5">
      {ws && <DeliveredButton ws={ws} t={t} />}
      {!items.length && <p className="text-sm text-ink-3 text-center mt-20">{t('noAlerts')}</p>}
      {items.map((n) => (
        <div key={n.id} className={cn('bg-surface border rounded-card p-3.5', n.tone === 'success' ? 'border-success/30' : n.tone === 'danger' ? 'border-danger/30' : n.tone === 'warn' ? 'border-warn/30' : 'border-line')}>
          <p className="text-sm">{n.text}</p><p className="text-[11px] text-ink-3 mt-1">{n.kind === 'sms' ? 'SMS (simulated) · ' : ''}{ago(n.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
