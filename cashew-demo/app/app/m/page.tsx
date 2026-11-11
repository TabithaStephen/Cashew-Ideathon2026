'use client';

import { Bell, Camera, Home } from 'lucide-react';
import { useState } from 'react';
import { Timeline } from '@/components/Timeline';
import { nextStep } from '@/components/app/nextStep';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatExportValue } from '@/lib/format';
import { tradeMilestones } from '@/lib/ui';
import { cn } from '@/lib/utils';

type Lang = 'en' | 'hi';
type Screen = 'home' | 'capture' | 'alerts';

// The 10 to 15 strings the blueprint asks for. The Hindi is a draft for a native speaker to review.
const STRINGS = {
  home: { en: 'Home', hi: 'होम' },
  capture: { en: 'Capture', hi: 'फ़ोटो लें' },
  alerts: { en: 'Alerts', hi: 'सूचनाएँ' },
  nextAction: { en: 'Next step', hi: 'अगला कदम' },
  currentTrade: { en: 'Current trade', hi: 'मौजूदा व्यापार' },
  noTrade: { en: 'No trade in progress.', hi: 'कोई व्यापार जारी नहीं है।' },
  goodsDelivered: { en: 'Goods delivered', hi: 'माल पहुँच गया' },
  deliveredDone: { en: 'Delivery confirmed', hi: 'डिलीवरी की पुष्टि हो गई' },
  notYet: { en: 'Available once this trade is financed.', hi: 'वित्त मिलने के बाद उपलब्ध।' },
  useSample: { en: 'Use sample photo', hi: 'नमूना फ़ोटो लें' },
  align: { en: 'Line up the document inside the frame.', hi: 'दस्तावेज़ को फ़्रेम के अंदर रखें।' },
  captured: { en: 'Photo captured (simulated).', hi: 'फ़ोटो ली गई (सिम्युलेटेड)।' },
  noAlerts: { en: 'No alerts yet.', hi: 'अभी कोई सूचना नहीं।' },
  offerFrom: { en: 'Offer from', hi: 'प्रस्ताव:' },
  milestone: { en: 'Please confirm delivery when the goods arrive.', hi: 'माल पहुँचने पर डिलीवरी की पुष्टि करें।' },
} as const;

function CaptureScreen({ t }: { t: (k: keyof typeof STRINGS) => string }) {
  const [captured, setCaptured] = useState(false);
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative flex-1 overflow-hidden bg-ink">
        <div className={cn('absolute inset-6 border-2', captured ? 'border-pass bg-sheet' : 'animate-pulse border-accent motion-reduce:animate-none')} />
        {captured && <div aria-hidden="true" className="absolute inset-10 space-y-2">{[100, 70, 90, 60, 100, 80].map((w) => <span key={w} className="block h-1 bg-rule" style={{ width: `${w}%` }} />)}</div>}
      </div>
      <p role="status" className="text-table">{captured ? t('captured') : t('align')}</p>
      <button type="button" onClick={() => setCaptured(true)} className="min-h-11 rounded-control border border-ink bg-accent font-semibold">{t('useSample')}</button>
    </div>
  );
}

export default function MobileView() {
  const [lang, setLang] = useState<Lang>('en');
  const [screen, setScreen] = useState<Screen>('home');
  const { data } = useApi<any>('trades', 1000);
  const { data: notes } = useApi<any>('notifications?after=0', 1000);
  const { run, busy } = useAction();
  const t = (key: keyof typeof STRINGS) => STRINGS[key][lang];

  const trades: any[] = (data?.trades ?? []).filter((x: any) => !x.history && !x.seededRace);
  const trade = trades[0];
  const step = trade && nextStep(trade);
  const financed = Boolean(trade?.commit);
  const delivered = (trade?.shipmentStage ?? 0) >= 4;
  const alerts: any[] = (notes?.notifications ?? []).filter((n: any) => n.kind === 'toast').slice(-6).reverse();

  const NAV: Array<[Screen, typeof Home]> = [['home', Home], ['capture', Camera], ['alerts', Bell]];

  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <div lang={lang} className="flex h-[844px] w-[min(390px,100%)] flex-none flex-col overflow-hidden rounded-[32px] border-[6px] border-ink bg-paper">
        <header className="flex min-h-14 items-center justify-between border-b-2 border-ink bg-sheet px-4">
          <span className="font-bold">Cashew</span>
          <div role="group" aria-label="Language" className="flex">
            {(['en', 'hi'] as const).map((code) => (
              <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)} className={cn('min-h-11 min-w-11 px-2', lang === code ? 'font-semibold shadow-[inset_0_-2px_0_var(--ink)]' : 'text-ink-2')}>{code === 'en' ? 'English' : 'हिन्दी'}</button>
            ))}
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {screen === 'home' && (
            trade ? (
              <>
                <section className="panel p-3">
                  <p className="field-label">{t('nextAction')}</p>
                  <p className="mt-1" lang="en">{step?.text}</p>
                </section>
                <section className="panel p-3">
                  <button
                    type="button"
                    disabled={!financed || delivered || busy}
                    onClick={() => run(() => api(`trades/${trade.id}/milestones`, { method: 'POST' }))}
                    className="min-h-14 w-full rounded-control border border-ink bg-accent font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {delivered ? t('deliveredDone') : t('goodsDelivered')}
                  </button>
                  {!financed && <p className="mt-2 text-table text-ink-2">{t('notYet')}</p>}
                </section>
                <section className="panel p-3">
                  <p className="field-label mb-2">{t('currentTrade')}</p>
                  <p className="mb-2 text-table" lang="en"><span className="font-mono text-label">{trade.id}</span><br />{trade.buyerName}<br /><span className="tabular">{formatExportValue(trade.value, trade.fx)}</span></p>
                  <div lang="en"><Timeline items={tradeMilestones(trade.status)} label="Trade progress" /></div>
                </section>
              </>
            ) : <p className="panel p-3">{t('noTrade')}</p>
          )}
          {screen === 'capture' && <CaptureScreen t={t} />}
          {screen === 'alerts' && (
            <>
              {financed && !delivered && <section className="panel p-3 font-medium">{t('milestone')}</section>}
              {alerts.map((note) => <section key={note.id} className="panel p-3 text-table" lang="en">{note.message}</section>)}
              {alerts.length === 0 && !(financed && !delivered) && <p className="panel p-3">{t('noAlerts')}</p>}
            </>
          )}
        </main>
        <nav aria-label="Phone" className="grid grid-cols-3 border-t-2 border-ink bg-sheet">
          {NAV.map(([key, Icon]) => (
            <button key={key} type="button" aria-current={screen === key ? 'page' : undefined} onClick={() => setScreen(key)} className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-table', screen === key ? 'font-semibold shadow-[inset_0_3px_0_var(--ink)]' : 'text-ink-2')}>
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              {t(key)}
            </button>
          ))}
        </nav>
      </div>
      <aside className="max-w-[320px] pt-2">
        <h1 className="text-display">Mobile view</h1>
        <p className="mt-2 text-ink-2">The exporter’s phone, on the same data as the desktop. Confirm “Goods delivered” here and the desktop timeline moves within a second.</p>
        <p className="mt-2 text-table text-ink-2">A web view inside a phone frame, not a native app. Hindi strings are a draft.</p>
      </aside>
    </div>
  );
}
