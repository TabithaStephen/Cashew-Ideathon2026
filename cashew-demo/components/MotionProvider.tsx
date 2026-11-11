'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

// Makes every Framer Motion animation honour prefers-reduced-motion.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
