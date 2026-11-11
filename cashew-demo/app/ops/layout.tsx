import type { ReactNode } from 'react';
import { AppShell } from '@/components/app/AppShell';

export default function OpsLayout({ children }: { children: ReactNode }) {
  return <AppShell area="ops">{children}</AppShell>;
}
