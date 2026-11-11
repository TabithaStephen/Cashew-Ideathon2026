'use client';

import { usePathname } from 'next/navigation';

export function DemoRibbon() {
  const path = usePathname();
  // The prototype has no demo panel, so it must not promise the D key.
  const proto = path?.startsWith('/proto');
  return (
    <div
      role="note"
      className="fixed inset-x-0 top-0 z-50 flex h-ribbon items-center justify-center overflow-hidden whitespace-nowrap bg-ink px-2 text-center text-[12px] leading-4 text-sheet"
    >
      {proto ? (
        'PROTOTYPE. All data is fictional and simulated.'
      ) : (
        <>
          {/* The full line doesn't fit a phone, and a phone has no D key. */}
          <span className="md:hidden">DEMO. External data sources are simulated.</span>
          <span className="max-md:hidden">DEMO ENVIRONMENT. External data sources are simulated. Press D for demo controls.</span>
        </>
      )}
    </div>
  );
}
