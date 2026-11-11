import type { ReactNode } from 'react';
import { AppShell } from '@/components/app/AppShell';

export default function ExporterLayout({ children }: { children: ReactNode }) {
  return <AppShell area="exporter">{children}</AppShell>;
}
