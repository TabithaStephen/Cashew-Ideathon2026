'use client';

import type { ReactNode } from 'react';
import { DialogShell } from './DialogShell';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

// 480px from the right, below the ribbon so the demo label stays visible.
export function Drawer(props: Props) {
  return <DialogShell {...props} enter={{ x: 32 }} panelClassName="bottom-[var(--tour-height)] right-0 top-ribbon w-full max-w-[480px] border-l-2 border-ink" />;
}
