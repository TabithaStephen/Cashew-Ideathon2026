'use client';

import { create } from 'zustand';

// UI state only (Blueprint 13.2). Trades, offers and everything else come from the API.
interface UiState {
  speed: number;
  stagedLabels: boolean;
  setDemo: (values: { speed: number; stagedLabels: boolean }) => void;
}

export const useUi = create<UiState>((set) => ({
  speed: 1,
  stagedLabels: true,
  setDemo: (values) => set(values),
}));

export const scaled = (ms: number, speed: number) => (speed === 0 ? 0 : ms / speed);
