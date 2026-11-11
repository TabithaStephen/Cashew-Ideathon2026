'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';

export class ClientApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const REFRESH = 'cashew:refresh';
export const refreshAll = () => window.dispatchEvent(new Event(REFRESH));

export async function api<T = any>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: options.method ?? (options.body !== undefined || options.form ? 'POST' : 'GET'),
      headers: options.form ? undefined : { 'content-type': 'application/json' },
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ClientApiError('NETWORK', 'Couldn’t reach the demo server. Your documents are safe. Try again.', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientApiError(json.error?.code ?? 'ERROR', json.error?.message ?? 'Something failed. Try again.', res.status);
  return json as T;
}

/** Fetches and keeps polling. Skips re-rendering when nothing changed, so forms on the page aren't disturbed. */
export function useApi<T = any>(path: string | null, poll = 1000) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ClientApiError>();
  const [settled, setSettled] = useState(false);
  const last = useRef('');
  const current = useRef(path);
  current.current = path;

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const result = await api<T>(path);
      if (current.current !== path) return;
      const text = JSON.stringify(result);
      if (text !== last.current) {
        last.current = text;
        setData(result);
      }
      setError(undefined);
    } catch (e) {
      if (current.current === path) setError(e as ClientApiError);
    } finally {
      if (current.current === path) setSettled(true);
    }
  }, [path]);

  useEffect(() => {
    last.current = '';
    setData(undefined);
    setSettled(false);
    setError(undefined);
    if (!path) return;
    void load();
    const timer = poll > 0 ? window.setInterval(() => void load(), poll) : undefined;
    const onRefresh = () => void load();
    window.addEventListener(REFRESH, onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(REFRESH, onRefresh);
    };
  }, [path, poll, load]);

  return { data, error, loading: !settled, refresh: load };
}

/** Runs a change, refreshes every view, and shows a failure as a toast (illegal transitions included). */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <R,>(work: () => Promise<R>): Promise<R | undefined> => {
      setBusy(true);
      try {
        const result = await work();
        refreshAll();
        return result;
      } catch (e) {
        toast((e as Error).message, { tone: 'fail' });
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}
