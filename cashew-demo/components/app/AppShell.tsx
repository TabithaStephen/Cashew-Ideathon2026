'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useToast } from '@/components/Toast';
import { api, refreshAll, useApi } from '@/lib/client/api';
import { useTour } from '@/lib/client/tourStore';
import { motionTokens } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const AREA_NAV = {
  exporter: [
    { href: '/app', label: 'Dashboard', exact: true },
    { href: '/app/trades/new', label: 'New trade', exact: true },
    { href: '/app/trades', label: 'Trades' },
    { href: '/app/passport', label: 'Passport' },
    { href: '/app/m', label: 'Mobile view' },
  ],
  lender: [
    { href: '/lender', label: 'Inbox', exact: true },
    { href: '/lender/products', label: 'Products' },
    { href: '/registry', label: 'Registry check' },
  ],
  ops: [
    { href: '/ops', label: 'Ops', exact: true },
    { href: '/registry', label: 'Registry' },
  ],
};
const HOME = { exporter: '/app', lender: '/lender', ops: '/ops' };
type RoleKey = keyof typeof AREA_NAV;

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="grid flex-none place-items-center rounded-control border-2 border-ink bg-accent font-bold text-ink" style={{ width: size, height: size, fontSize: size * 0.58 }}>
      C
    </span>
  );
}

function RolePicker({ me }: { me: any }) {
  const router = useRouter();
  const value = me.role === 'lender' ? `lender:${me.lenderId}` : me.role;
  return (
    <label className="flex items-center gap-2">
      <span className="field-label max-sm:sr-only">Viewing as</span>
      <select
        className="input w-auto"
        value={value}
        onChange={async (event) => {
          const [role, lenderId] = event.target.value.split(':');
          await api('session', { body: { role, lenderId } });
          refreshAll();
          router.push(HOME[role as RoleKey]);
        }}
      >
        <option value="exporter">Exporter</option>
        {me.lenders.map((lender: any) => (
          <option key={lender.id} value={`lender:${lender.id}`}>Lender: {lender.legalName}</option>
        ))}
        <option value="ops">Ops: Asha</option>
      </select>
    </label>
  );
}

// New notifications become toasts. A simulated SMS gets its own labelled preview.
function NotificationFeed() {
  const toast = useToast();
  const [after, setAfter] = useState<number>();
  const { data } = useApi<any>(`notifications?after=${after ?? 999999}`, 1000);
  const [sms, setSms] = useState<string>();
  const shown = useRef(0);

  useEffect(() => {
    if (!data) return;
    if (after === undefined || data.latest < after) {
      shown.current = data.latest;
      setAfter(data.latest);
      return;
    }
    let newest = after;
    for (const note of data.notifications) {
      newest = Math.max(newest, note.id);
      if (note.id <= shown.current) continue;
      shown.current = note.id;
      if (note.kind === 'sms') setSms(note.message);
      else toast(note.message, { tone: note.tone });
    }
    if (newest !== after) setAfter(newest);
  }, [data, after, toast]);

  return (
    <AnimatePresence>
      {sms && (
        <motion.aside
          aria-label="Simulated message"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
          className="fixed bottom-[calc(80px+var(--tour-height))] right-4 z-[75] w-[min(360px,calc(100vw-32px))] border-2 border-ink bg-sheet"
        >
          <header className="flex items-center justify-between border-b border-rule py-0.5 pl-3 pr-0.5">
            <span className="flex items-center gap-2 text-table font-semibold">
              <MessageSquare size={18} strokeWidth={2} aria-hidden="true" />
              Simulated message
            </span>
            <button type="button" aria-label="Dismiss message" onClick={() => setSms(undefined)} className="grid size-11 place-items-center rounded-control hover:bg-paper">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>
          <p className="p-3 text-table">{sms}</p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children, area }: { children: ReactNode; area?: RoleKey }) {
  const path = usePathname() ?? '';
  const router = useRouter();
  const { data: me, error } = useApi<any>('orgs/me', 2000);
  const touring = useTour((s) => s.active);

  useEffect(() => {
    // The guided demo switches roles and navigates for itself, so a redirect here would fight it.
    if (touring) return;
    if (error?.status === 401) router.replace('/');
    else if (me && area && me.role !== area) router.replace(HOME[me.role as RoleKey]);
  }, [error, me, area, router, touring]);

  const nav = AREA_NAV[(me?.role ?? area ?? 'exporter') as RoleKey];
  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return path === item.href;
    if (item.href === '/app/trades') return path.startsWith('/app/trades') && path !== '/app/trades/new';
    return path.startsWith(item.href);
  };

  return (
    <div className="md:flex">
      <aside className="z-20 border-ink bg-sheet max-md:border-b-2 md:sticky md:top-[calc(var(--ribbon-height)+var(--caption-height))] md:h-[calc(100vh-var(--ribbon-height)-var(--caption-height))] md:w-sidebar md:flex-none md:border-r">
        <Link href="/" className="flex h-topbar items-center gap-2 border-b border-rule px-4 font-bold max-md:h-12">
          <Logo />
          Cashew
        </Link>
        <nav aria-label="Main" className="flex overflow-x-auto md:block md:py-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              className={cn(
                'flex min-h-11 flex-none items-center whitespace-nowrap px-4 transition-colors duration-fast hover:bg-paper',
                isActive(item) ? 'font-semibold shadow-[inset_-3px_0_0_var(--ink)] max-md:shadow-[inset_0_-3px_0_var(--ink)]' : 'text-ink-2',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-topbar flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-ink bg-sheet px-4 py-2 md:px-8">
          <p className="font-semibold">{me?.displayName ?? ' '}</p>
          {me && <RolePicker me={me} />}
        </header>
        <main className="mx-auto max-w-content px-4 pb-24 pt-6 md:px-8">{children}</main>
      </div>
      {me && <NotificationFeed key={`${me.role}:${me.lenderId ?? ''}`} />}
    </div>
  );
}
