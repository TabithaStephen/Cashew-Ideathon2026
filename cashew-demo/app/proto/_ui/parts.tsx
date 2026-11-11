'use client';

import { AlertTriangle, Check, CircleHelp, Clock, Loader, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLang } from '../_lib/i18n';
import type { StringKey } from '../_lib/strings';
import { formatExportValue } from '@/lib/format';
import { FX, trade } from '../_lib/data';

export type ViewState = 'ready' | 'loading' | 'empty' | 'error';
const VIEW_STATES: Array<[ViewState, StringKey]> = [
  ['ready', 'stateReady'],
  ['loading', 'stateLoading'],
  ['empty', 'stateEmpty'],
  ['error', 'stateError'],
];

// Sample "fetch". A short loading state runs first; ?state= opens a specific state directly.
export function useViewState() {
  const [state, setState] = useState<ViewState>('loading');
  const load = useCallback(() => {
    setState('loading');
    window.setTimeout(() => setState('ready'), 500);
  }, []);
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('state');
    if (wanted === 'ready' || wanted === 'empty' || wanted === 'error' || wanted === 'loading') {
      setState(wanted);
    } else {
      load();
    }
  }, [load]);
  return { state, setState, retry: load };
}

export function StateBar({ state, onChange }: { state: ViewState; onChange: (s: ViewState) => void }) {
  const { t } = useLang();
  return (
    <div className="mf-states" role="group" aria-label={t('previewState')}>
      <span className="mf-label">{t('previewState')}</span>
      {VIEW_STATES.map(([value, key]) => (
        <button key={value} type="button" aria-pressed={state === value} onClick={() => onChange(value)}>
          {t(key)}
        </button>
      ))}
    </div>
  );
}

const STATUS_ICON = { pass: Check, fail: X, warn: AlertTriangle, unknown: CircleHelp, pending: Clock, checking: Loader };

export function Status({ kind }: { kind: 'pass' | 'fail' | 'unknown' | 'pending' | 'checking' }) {
  const { t } = useLang();
  const Icon = STATUS_ICON[kind];
  const tone = kind === 'checking' ? 'pending' : kind;
  return (
    <span className={`mf-status mf-status-${tone}`}>
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      {t(kind)}
    </span>
  );
}

export function TradeTag({ amended = false }: { amended?: boolean }) {
  const { t } = useLang();
  const cells: Array<[StringKey, ReactNode, boolean?]> = [
    ['tradeRef', trade.ref, true],
    ['buyer', trade.buyer],
    ['invoice', trade.invoiceNo, true],
    ['value', formatExportValue(amended ? trade.amendedUsd : trade.originalUsd, FX)],
  ];
  return (
    <dl className="mf-tag" style={{ margin: 0 }}>
      {cells.map(([label, value, mono]) => (
        <div key={label}>
          <dt className="mf-label">{t(label)}</dt>
          <dd className={mono ? 'mf-mono' : 'mf-num'}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Blank({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mf-blank">
      <p style={{ margin: 0 }}>{children}</p>
      {action}
    </div>
  );
}

export function ErrorBlank({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLang();
  return (
    <div className="mf-blank" role="alert">
      <span className="mf-status mf-status-fail">
        <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
        {t('stateError')}
      </span>
      <p style={{ margin: 0 }}>{message}</p>
      <button type="button" className="mf-btn" onClick={onRetry}>
        {t('retry')}
      </button>
    </div>
  );
}

export function SkeletonRows({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div className="mf-ledger" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div className="mf-skel-row" key={i}>
          <span className="mf-skel" />
          <span className="mf-skel" />
          <span className="mf-skel" />
          <span className="mf-skel" />
        </div>
      ))}
    </div>
  );
}

export function PageHead({ title, intro }: { title: string; intro: string }) {
  return (
    <header>
      <h1 className="mf-h1">{title}</h1>
      <p className="mf-muted" style={{ margin: '4px 0 0', maxWidth: '68ch' }}>
        {intro}
      </p>
    </header>
  );
}
