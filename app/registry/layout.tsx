import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense><AppShell>{children}</AppShell></Suspense>;
}
