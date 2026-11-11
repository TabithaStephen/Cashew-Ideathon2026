import type { ReactNode } from 'react';
import { AppShell } from '@/components/app/AppShell';

export default function LenderLayout({ children }: { children: ReactNode }) {
  return <AppShell area="lender">{children}</AppShell>;
}
