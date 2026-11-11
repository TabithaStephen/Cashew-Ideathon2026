import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DemoHost } from '@/components/app/DemoHost';
import { DemoRibbon } from '@/components/DemoRibbon';
import { MotionProvider } from '@/components/MotionProvider';
import { ToastProvider } from '@/components/Toast';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cashew: one verified trade, many lenders',
  description: 'Presentation demo. All people, companies and data are fictional.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <DemoRibbon />
        <MotionProvider>
          <ToastProvider>
            {children}
            <DemoHost />
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
