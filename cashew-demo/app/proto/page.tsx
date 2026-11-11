'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLang } from './_lib/i18n';
import type { StringKey } from './_lib/strings';
import { PageHead } from './_ui/parts';

const SCREENS: Array<[string, StringKey, StringKey]> = [
  ['/proto/verification', 'navVerification', 'indexVerification'],
  ['/proto/offers', 'navOffers', 'indexOffers'],
  ['/proto/tracking', 'navTracking', 'indexTracking'],
  ['/proto/duplicate', 'navDuplicate', 'indexDuplicate'],
];

export default function ProtoIndex() {
  const { t } = useLang();
  return (
    <div className="mf-stack">
      <PageHead title={t('indexTitle')} intro={t('indexIntro')} />
      <ol className="mf-index">
        {SCREENS.map(([href, title, sub], i) => (
          <li key={href}>
            <Link href={href}>
              <span className="mf-mono mf-muted">{i + 1}</span>
              <span>
                <span className="mf-h2" style={{ display: 'block' }}>
                  {t(title)}
                </span>
                <span className="mf-muted mf-small">{t(sub)}</span>
              </span>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
