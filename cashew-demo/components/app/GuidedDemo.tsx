'use client';

import { Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { api, refreshAll } from '@/lib/client/api';
import { useTour } from '@/lib/client/tourStore';
import { useUi } from '@/lib/client/uiStore';
import { CHAPTERS, TOUR, type TourContext } from '@/lib/demo/tour';
import { cn } from '@/lib/utils';

class Cancelled extends Error {}

const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === 'fixed';

function findByText(text: string): HTMLElement | undefined {
  const named = document.querySelector<HTMLElement>(`[data-tour="${text}"]`);
  if (named) return named;
  const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_ELEMENT);
  let best: HTMLElement | undefined;
  const dialogs = document.querySelectorAll('[role=dialog]');
  const roots: Element[] = dialogs.length ? [dialogs[dialogs.length - 1]] : [];
  const search = (el: HTMLElement) => {
    if (visible(el) && el.innerText?.includes(text) && (!best || best.contains(el))) best = el;
  };
  if (roots.length) roots[0].querySelectorAll<HTMLElement>('*').forEach(search);
  else while (walker.nextNode()) search(walker.currentNode as HTMLElement);
  return best;
}

const clearSpot = () => document.querySelectorAll('[data-tour-on]').forEach((el) => el.removeAttribute('data-tour-on'));

export function GuidedDemo() {
  const router = useRouter();
  const path = usePathname();
  const { active, status, index, playing, error, runId, stop, goTo, set, retry, start } = useTour();
  const dock = useRef<HTMLElement>(null);
  const token = useRef(0);
  const shared = useRef<{ tradeId?: string }>({});
  const pathRef = useRef(path);
  pathRef.current = path;

  // Slower or faster with the demo speed. Instant is for rehearsal and tests.
  const pace = () => {
    const speed = useUi.getState().speed;
    return speed === 0 ? 0.05 : 1 / speed;
  };

  const context = useCallback((mine: number): TourContext => {
    const live = () => {
      if (token.current !== mine) throw new Cancelled();
    };
    const sleep = async (ms: number) => {
      await new Promise((r) => setTimeout(r, ms));
      live();
    };
    const until = async (test: () => boolean, what: string, ms = 20000) => {
      const limit = Date.now() + ms;
      for (;;) {
        live();
        if (test()) return;
        if (Date.now() > limit) throw new Error(`Timed out waiting for ${what}.`);
        await sleep(50);
      }
    };
    const point = async (el: HTMLElement, ms: number) => {
      clearSpot();
      el.setAttribute('data-tour-on', '');
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      await sleep(ms * pace());
    };
    const ctx: TourContext = {
      get tradeId() { return shared.current.tradeId; },
      set tradeId(id) { shared.current.tradeId = id; },
      api: async (route, body) => {
        live();
        const result = await api(route, { method: 'POST', body: body ?? {} });
        refreshAll();
        return result;
      },
      read: async (route) => {
        live();
        return api(route);
      },
      as: async (role, lenderId) => {
        live();
        await api('session', { body: { role, lenderId } });
        refreshAll();
      },
      go: async (target) => {
        live();
        clearSpot();
        router.push(target);
        const pathname = target.split('?')[0];
        await until(() => location.pathname === pathname, `the page ${pathname}`);
        await sleep(100);
      },
      see: (text, ms) => until(() => document.body.innerText.includes(text), `“${text}”`, ms),
      until,
      spot: async (target) => {
        await until(() => Boolean(findByText(target)), `“${target}”`, 8000);
        await point(findByText(target)!, 200);
      },
      press: async (label, scope) => {
        const find = () => {
          const dialogs = document.querySelectorAll('[role=dialog]');
          const root: ParentNode = scope ? document.querySelector(scope) ?? document : dialogs.length ? dialogs[dialogs.length - 1] : document.querySelector('main') ?? document;
          const all = [...root.querySelectorAll<HTMLElement>('button,a')].filter((el) => visible(el) && !(el as HTMLButtonElement).disabled && !el.closest('[data-tour-dock]'));
          return all.find((el) => el.innerText.trim() === label || el.getAttribute('aria-label') === label) ?? all.find((el) => el.innerText.trim().startsWith(label));
        };
        await until(() => Boolean(find()), `the “${label}” button`);
        const el = find()!;
        await point(el, 700);
        clearSpot();
        el.click();
        await sleep(150 * pace());
      },
      type: async (selector, value) => {
        await until(() => Boolean(document.querySelector(selector)), selector);
        const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
        await point(el, 500);
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(400 * pace());
        clearSpot();
      },
      tick: async (selector) => {
        await until(() => Boolean(document.querySelector(selector)), selector);
        const el = document.querySelector<HTMLInputElement>(selector)!;
        await point((el.closest('label') as HTMLElement) ?? el, 500);
        clearSpot();
        el.click();
        await sleep(150 * pace());
      },
    };
    return ctx;
  }, [router]);

  // Keeps page content clear of the dock.
  useEffect(() => {
    const root = document.documentElement;
    if (!active || !dock.current) {
      root.style.setProperty('--tour-height', '0px');
      return;
    }
    const observer = new ResizeObserver(() => root.style.setProperty('--tour-height', `${dock.current?.offsetHeight ?? 0}px`));
    observer.observe(dock.current);
    return () => observer.disconnect();
  }, [active]);

  // Runs the current step.
  useEffect(() => {
    if (!active) return;
    const mine = ++token.current;
    let cancelled = false;
    clearSpot();
    void (async () => {
      try {
        await TOUR[index].run(context(mine));
        if (!cancelled && token.current === mine) set({ status: index === TOUR.length - 1 ? 'done' : 'holding' });
      } catch (e) {
        if (e instanceof Cancelled || cancelled) return;
        set({ status: 'failed', error: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, index, runId, context, set]);

  // Gives people time to read, then moves on.
  useEffect(() => {
    if (!active || status !== 'holding' || !playing) return;
    const reading = Math.max(4000, TOUR[index].say.length * 55) * pace();
    const timer = window.setTimeout(() => goTo(index + 1), reading);
    return () => window.clearTimeout(timer);
  }, [active, status, playing, index, goTo]);

  useEffect(() => {
    if (!active) clearSpot();
  }, [active]);

  // The demo drives the page, so a stray click can't derail it. Its own presses aren't "trusted" events, so they
  // pass. Scrolling still works, and the bar's own buttons stay live.
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timer: number | undefined;
    const stop = (event: Event) => {
      if (!event.isTrusted || (event.target as Element | null)?.closest?.('[data-tour-dock]')) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'click') {
        setBlocked(true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setBlocked(false), 4000);
      }
    };
    const stopKeys = (event: KeyboardEvent) => {
      if ((event.target as Element | null)?.closest?.('[data-tour-dock]')) return;
      if (['Escape', 'Enter', ' '].includes(event.key)) stop(event);
    };
    document.addEventListener('mousedown', stop, true);
    document.addEventListener('click', stop, true);
    document.addEventListener('keydown', stopKeys, true);
    return () => {
      window.clearTimeout(timer);
      setBlocked(false);
      document.removeEventListener('mousedown', stop, true);
      document.removeEventListener('click', stop, true);
      document.removeEventListener('keydown', stopKeys, true);
    };
  }, [active]);

  const exit = useCallback(async () => {
    token.current += 1;
    stop();
    clearSpot();
    await api('demo/scenario', { body: { id: 'B' } }).catch(() => undefined);
    refreshAll();
    router.push('/');
  }, [router, stop]);

  const restart = useCallback(() => {
    token.current += 1;
    shared.current = {};
    start();
  }, [start]);

  const canAdvance = status === 'holding';
  const togglePlay = useCallback(() => set({ playing: !useTour.getState().playing }), [set]);
  const next = useCallback(() => {
    const s = useTour.getState();
    if (s.status === 'holding') s.goTo(s.index + 1);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'p' || event.key === 'P') togglePlay();
      else if (event.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, togglePlay, next]);

  const step = TOUR[index];
  const chapterSteps = useMemo(() => CHAPTERS.map((chapter) => TOUR.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === chapter)), []);
  if (!active) return null;

  return (
    <section ref={dock} data-tour-dock data-above-scrim aria-label="Guided demo" className="fixed inset-x-0 bottom-0 z-[85] border-t-2 border-ink bg-sheet">
      <ol aria-hidden="true" className="flex gap-0.5 bg-rule">
        {chapterSteps.map((steps, c) => (
          <li key={CHAPTERS[c]} className="flex flex-1 gap-px" style={{ flexGrow: steps.length }}>
            {steps.map(({ i }) => <span key={i} className={cn('h-1.5 flex-1', i < index ? 'bg-ink' : i === index ? 'bg-accent' : 'bg-sheet')} />)}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8">
        <div className="min-w-[280px] flex-1" aria-live="polite">
          <p className="field-label">
            {step.chapter}. Step {index + 1} of {TOUR.length}
          </p>
          <h2 data-testid="tour-title">{step.title}</h2>
          {status === 'failed' ? (
            <p role="alert" className="max-w-[90ch] font-medium text-fail">This step couldn’t finish. {error} Try it again, or restart the demo.</p>
          ) : (
            <p className="max-w-[90ch]">{step.say}</p>
          )}
          {blocked && <p role="status" data-testid="tour-blocked" className="mt-1 text-table font-semibold">The demo is driving, so clicks on the page are paused. Choose Exit to click around yourself.</p>}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          {status === 'failed' ? (
            <>
              <Button variant="primary" onClick={retry}>Try again</Button>
              <Button variant="ghost" onClick={restart}>Restart</Button>
            </>
          ) : status === 'done' ? (
            <Button variant="primary" onClick={restart}><RotateCcw size={18} strokeWidth={2} aria-hidden="true" /> Watch again</Button>
          ) : (
            <>
              <Button onClick={togglePlay} aria-pressed={!playing}>
                {playing ? <Pause size={18} strokeWidth={2} aria-hidden="true" /> : <Play size={18} strokeWidth={2} aria-hidden="true" />}
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button variant="primary" disabled={!canAdvance} onClick={next}>
                <SkipForward size={18} strokeWidth={2} aria-hidden="true" />
                {status === 'acting' ? 'Working' : 'Next'}
              </Button>
              <Button variant="ghost" onClick={restart}>Restart</Button>
            </>
          )}
          <Button variant="ghost" onClick={() => void exit()}><X size={18} strokeWidth={2} aria-hidden="true" /> Exit</Button>
        </div>
      </div>
    </section>
  );
}
