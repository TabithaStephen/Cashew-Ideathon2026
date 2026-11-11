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

// 560px, centred, with a 16px gutter and internal scrolling on small screens.
export function Modal(props: Props) {
  return (
    <DialogShell
      {...props}
      enter={{ y: 12 }}
      panelClassName="inset-x-4 top-[calc(var(--ribbon-height)+16px)] mx-auto max-h-[calc(100dvh-var(--ribbon-height)-var(--tour-height)-32px)] max-w-[560px] border-2 border-ink"
    />
  );
}
