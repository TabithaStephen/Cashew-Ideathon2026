'use client';
import { ArrowLeftRight, BadgeCheck, Boxes, ChevronDown, ClipboardList, FilePlus2, HeartPulse, Inbox, LayoutDashboard, ListChecks, ScrollText, ShieldCheck, Smartphone, Layers } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/client';
import { homeFor, useMe } from '@/lib/session';
import type { Role } from '@/lib/types';
import { CashewMark } from './EmptyState';

type Nav = { href: string; label: string; icon: typeof Inbox; match?: (p: string, q: URLSearchParams) => boolean };
const NAV: Record<Role, Nav[]> = {
  exporter: [
    { href: '/app', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/app' },
    { href: '/app/trades/new', label: 'New trade', icon: FilePlus2, match: (p) => p.startsWith('/app/trades/new') },
    { href: '/app/trades', label: 'Trades', icon: ListChecks, match: (p) => p.startsWith('/app/trades') && !p.startsWith('/app/trades/new') },
    { href: '/app/passport', label: 'Passport', icon: BadgeCheck },
    { href: '/app/m', label: 'Mobile view', icon: Smartphone },
  ],
  lender: [
    { href: '/lender', label: 'Inbox', icon: Inbox, match: (p) => p === '/lender' || p.startsWith('/lender/trades') },
    { href: '/lender/products', label: 'Products', icon: Boxes },
    { href: '/registry', label: 'Registry check', icon: ShieldCheck },
  ],
  ops: [
    { href: '/ops', label: 'Review queue', icon: ClipboardList, match: (p, q) => p === '/ops' && (!q.get('tab') || q.get('tab') === 'queue') },
    { href: '/ops?tab=audit', label: 'Audit log', icon: ScrollText, match: (p, q) => p === '/ops' && q.get('tab') === 'audit' },
    { href: '/ops?tab=health', label: 'Health', icon: HeartPulse, match: (p, q) => p === '/ops' && q.get('tab') === 'health' },
    { href: '/registry', label: 'Registry', icon: Layers },
  ],
};
const ROLE_LABEL: Record<Role, string> = { exporter: 'Exporter', lender: 'Lender', ops: 'Ops' };

export function AppShell({ children, role: expected }: { children: React.ReactNode; role?: Role }) {
  const me = useMe();
  const router = useRouter();
  const path = usePathname();
  const q = useSearchParams();
  const role = me.data?.session?.role ?? expected ?? 'exporter';
  useEffect(() => {
    if (me.data && !me.data.session) router.replace('/');
  }, [me.data, router]);
  return (
    <div className="min-h-[calc(100vh-var(--ribbon-h,24px))] flex">
      <aside className="w-sidebar shrink-0 border-r border-line bg-surface/60 hidden md:flex flex-col sticky top-[var(--ribbon-h,24px)] h-[calc(100vh-var(--ribbon-h,24px))]">
        <Link href="/" className="h-topbar flex items-center gap-2.5 px-6 border-b border-line">
          <CashewMark size={26} />
          <span className="font-display text-[20px] font-semibold tracking-tight">Cashew</span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Main">
          {NAV[role].map((n) => {
            const active = n.match ? n.match(path, q) : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
                className={cn('flex items-center gap-3 h-10 px-3 rounded-btn text-sm transition-colors duration-fast',
                  active ? 'bg-brand-soft text-brand font-semibold' : 'text-ink-2 hover:bg-canvas hover:text-ink')}>
                <n.icon size={20} strokeWidth={1.75} aria-hidden />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-caption text-ink-3 border-t border-line">Fictional data. USD 1 = ₹85.00</div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-topbar border-b border-line bg-canvas/90 backdrop-blur sticky top-[var(--ribbon-h,24px)] z-30 flex items-center justify-between px-8">
          <div className="min-w-0">
            <p className="text-caption text-ink-3">{ROLE_LABEL[role]}{me.data ? ` · Scenario ${me.data.scenario}` : ''}</p>
            <p className="text-sm font-semibold truncate">{me.data?.org?.legalName ?? ' '}</p>
          </div>
          <RoleSwitcher />
        </header>
        <main className="flex-1 w-full max-w-content mx-auto p-8">{children}</main>
      </div>
    </div>
  );
}

function RoleSwitcher() {
  const me = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const orgs = me.data?.orgs ?? [];
  const groups: { role: Role; label: string; orgs: typeof orgs }[] = [
    { role: 'exporter', label: 'Exporter', orgs: orgs.filter((o) => o.type === 'sme') },
    { role: 'lender', label: 'Lender', orgs: orgs.filter((o) => o.type === 'lender') },
    { role: 'ops', label: 'Ops', orgs: orgs.filter((o) => o.type === 'platform') },
  ];
  const pick = async (role: Role, orgId: string) => {
    setOpen(false);
    await api('/api/session', { json: { role, orgId } });
    router.push(homeFor(role));
    router.refresh();
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2 h-9 px-3 rounded-btn border border-line bg-surface text-sm hover:border-ink-3/40">
        <ArrowLeftRight size={16} strokeWidth={1.75} className="text-ink-3" />
        <span className="hidden sm:inline">Switch role</span>
        <ChevronDown size={16} strokeWidth={1.75} className="text-ink-3" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 bg-surface border border-line rounded-card shadow-md p-2 z-50">
          {groups.map((g) => (
            <div key={g.role} className="py-1">
              <p className="px-2 py-1 text-caption text-ink-3">{g.label}</p>
              {g.orgs.map((o) => {
                const cur = me.data?.session?.role === g.role && me.data?.session?.orgId === o.id;
                return (
                  <button key={o.id} role="menuitem" onClick={() => pick(g.role, o.id)}
                    className={cn('w-full text-left px-2 h-9 rounded-btn text-sm flex items-center justify-between hover:bg-canvas', cur && 'bg-brand-soft text-brand font-semibold')}>
                    <span>{g.role === 'ops' ? 'Asha (Cashew Ops)' : o.shortName}</span>
                    {o.id === me.data?.scenarioExporter && g.role === 'exporter' && <span className="text-[11px] text-ink-3">this scenario</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
