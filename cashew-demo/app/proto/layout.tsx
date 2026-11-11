import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './proto.css';
import { ProtoChrome } from './_ui/ProtoChrome';

export const metadata: Metadata = {
  title: 'Cashew prototype (sample data)',
  description: 'Prototype screens on fictional sample data.',
};

export default function ProtoLayout({ children }: { children: ReactNode }) {
  return <ProtoChrome>{children}</ProtoChrome>;
}
