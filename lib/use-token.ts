'use client';
import { useEffect, useState } from 'react';
/** Read a colour token (CSS variable "r g b") for SVG/Recharts attributes, which can't use var(). */
export function useToken(name: string, alpha = 1) {
  const [c, setC] = useState('rgb(124 136 127)');
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
    if (v) setC(`rgb(${v} / ${alpha})`);
  }, [name, alpha]);
  return c;
}
