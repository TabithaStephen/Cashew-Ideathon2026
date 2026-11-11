'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LangProvider, useLang } from '../_lib/i18n';
import type { Lang, StringKey } from '../_lib/strings';

const NAV: Array<[string, StringKey]> = [
  ['/proto/verification', 'navVerification'],
  ['/proto/offers', 'navOffers'],
  ['/proto/tracking', 'navTracking'],
  ['/proto/duplicate', 'navDuplicate'],
];

const LANGS: Array<[Lang, string, string]> = [
  ['en', 'EN', 'English'],
  ['hi', 'हि', 'हिन्दी'],
  ['ta', 'த', 'தமிழ்'],
];

function Bars({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useLang();
  const path = usePathname();
  return (
    <>
      <div className="mf-top">
        <div className="mf-top-in">
          <Link href="/proto" className="mf-brand">
            {t('brand')}
          </Link>
          <span className="mf-label">{t('sample')}</span>
          <div className="mf-lang" role="group" aria-label="Language">
            {LANGS.map(([code, short, name]) => (
              <button key={code} type="button" aria-pressed={lang === code} aria-label={name} onClick={() => setLang(code)}>
                {short}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mf-navwrap">
        <nav className="mf-nav" aria-label="Prototype screens">
          {NAV.map(([href, key]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
              {t(key)}
            </Link>
          ))}
        </nav>
      </div>
      <main className="mf-main">{children}</main>
    </>
  );
}

export function ProtoChrome({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <Bars>{children}</Bars>
    </LangProvider>
  );
}
