'use client';

import { create } from 'zustand';

export type TourStatus = 'off' | 'acting' | 'holding' | 'failed' | 'done';

interface TourState {
  active: boolean;
  status: TourStatus;
  index: number;
  playing: boolean;
  error?: string;
  /** Bumped on every (re)start, so a restart at the same step still runs it. */
  runId: number;
  start: () => void;
  stop: () => void;
  goTo: (index: number) => void;
  set: (patch: Partial<Pick<TourState, 'status' | 'playing' | 'error'>>) => void;
  retry: () => void;
}

export const useTour = create<TourState>((set) => ({
  active: false,
  status: 'off',
  index: 0,
  playing: true,
  runId: 0,
  start: () => set((s) => ({ active: true, status: 'acting', index: 0, playing: true, error: undefined, runId: s.runId + 1 })),
  stop: () => set({ active: false, status: 'off', index: 0, error: undefined }),
  goTo: (index) => set((s) => ({ index, status: 'acting', error: undefined, runId: s.runId + 1 })),
  set: (patch) => set(patch),
  retry: () => set((s) => ({ status: 'acting', error: undefined, runId: s.runId + 1 })),
}));
