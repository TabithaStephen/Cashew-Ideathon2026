'use client';
// Browser-side API client + polling hook. Server state always comes from the API.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUI } from './ui-store';

export class ClientApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

export async function api<T = unknown>(path: string, opts: { method?: string; json?: unknown; form?: FormData; quiet?: boolean } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.json !== undefined || opts.form ? 'POST' : 'GET'),
    headers: opts.json !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ClientApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? 'Something went wrong.');
    if (!opts.quiet) useUI.getState().toast({ tone: 'danger', text: err.message });
    throw err;
  }
  refreshAll();
  return data as T;
}

/** Ask every mounted useApi hook to refetch (after a mutation). */
let channel: BroadcastChannel | null = null;
function bus() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel('cashew');
    channel.onmessage = () => window.dispatchEvent(new Event('cashew:refresh'));
  }
  return channel;
}
/** Ask every mounted useApi hook, in this tab and other open tabs, to refetch now. */
export function refreshAll() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('cashew:refresh'));
  try { bus()?.postMessage('refresh'); } catch { /* ignore */ }
}

export function useApi<T>(path: string | null, intervalMs?: number) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const pathRef = useRef(path);
  pathRef.current = path;
  const inflight = useRef<string | null>(null);

  const load = useCallback(async () => {
    const p = pathRef.current;
    if (!p || inflight.current === p) return;
    inflight.current = p;
    try {
      const res = await fetch(p, { cache: 'no-store', headers: { 'x-cashew-soft': '1' } });
      const json = await res.json().catch(() => ({}));
      if (p !== pathRef.current) return;
      if (!res.ok || json?.error) { setError(new ClientApiError(json?.error?.status ?? res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? 'Error')); }
      else { setData(json as T); setError(null); }
    } catch { /* offline blip: keep last data */ } finally { if (inflight.current === p) inflight.current = null; setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(!!path);
    if (!path) return;
    load();
    bus();
    const onRefresh = () => load();
    window.addEventListener('cashew:refresh', onRefresh);
    const iv = intervalMs ? setInterval(load, intervalMs) : undefined;
    return () => { window.removeEventListener('cashew:refresh', onRefresh); if (iv) clearInterval(iv); };
  }, [path, intervalMs, load]);

  return { data, error, loading, refresh: load };
}
