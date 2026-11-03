'use client';
// Zustand: UI state only (Blueprint 13.2). Server state is fetched through the API.
import { create } from 'zustand';

export interface ToastItem { id: number; tone: 'info' | 'success' | 'warn' | 'danger'; text: string; action?: { label: string; href: string } }

interface UIState {
  toasts: ToastItem[];
  toast: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
  demoPanelOpen: boolean; setDemoPanel: (v: boolean) => void;
  presenterNotes: boolean; setPresenterNotes: (v: boolean) => void;
  presenterStep: number; setPresenterStep: (n: number) => void;
  showStagedLabels: boolean; setShowStagedLabels: (v: boolean) => void;
  speed: number; setSpeed: (n: number) => void;
  sms: { id: number; text: string } | null; setSms: (m: UIState['sms']) => void;
  /** Bumped when Esc is pressed so drawers/modals can close themselves. */
  escTick: number; bumpEsc: () => void;
}

let nextToast = 1;
export const loadFlag = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const save = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  toast: (t) => {
    const id = nextToast++;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    const sp = get().speed;
    setTimeout(() => get().dismiss(id), sp === 0 ? 1500 : 4000 / sp);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  demoPanelOpen: false, setDemoPanel: (v) => set({ demoPanelOpen: v }),
  presenterNotes: false,
  setPresenterNotes: (v) => { save('cashew.notes', v); set({ presenterNotes: v }); },
  presenterStep: 0, setPresenterStep: (n) => set({ presenterStep: n }),
  showStagedLabels: true,
  setShowStagedLabels: (v) => { save('cashew.staged', v); set({ showStagedLabels: v }); },
  speed: 1, setSpeed: (n) => set({ speed: n }),
  sms: null, setSms: (m) => set({ sms: m }),
  escTick: 0, bumpEsc: () => set({ escTick: get().escTick + 1 }),
}));

/** Scale a 1x duration by the current speed (Instant → 0). */
export const scaled = (ms: number, speed: number) => (speed === 0 ? 0 : ms / speed);

/** Called once on mount (after hydration) to restore per-viewer conveniences. */
export function hydrateUIFromStorage() {
  useUI.setState({ presenterNotes: loadFlag('cashew.notes', false), showStagedLabels: loadFlag('cashew.staged', true) });
}
