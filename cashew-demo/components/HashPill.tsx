'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { truncateHash } from '@/lib/format';
import { useToast } from './Toast';

export function HashPill({ hash, label = 'hash' }: { hash: string; label?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
      toast('Copied', { tone: 'pass' });
    } catch {
      // Blocked clipboard, or a page not served from localhost or https.
      toast('Couldn’t copy. Your browser blocked it.', { tone: 'fail' });
    }
  };

  return (
    <button
      type="button"
      title={hash}
      aria-label={`Copy ${label} ${hash}`}
      onClick={copy}
      className="inline-flex min-h-7 w-fit items-center gap-1.5 rounded-control border border-rule bg-paper px-2 font-mono text-label text-ink transition-colors duration-fast hover:border-ink max-md:min-h-11"
    >
      {truncateHash(hash)}
      {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
    </button>
  );
}
