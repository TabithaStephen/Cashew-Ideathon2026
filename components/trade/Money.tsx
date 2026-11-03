import { exportValue, inr } from '@/lib/format';
/** Export values always show both currencies and the rate. */
export function ExportValue({ usd, fx = 85, className }: { usd: number; fx?: number; className?: string }) {
  return <span className={`tabular ${className ?? ''}`}>{exportValue(usd, fx)}</span>;
}
export const Inr = ({ v, className }: { v: number; className?: string }) => <span className={`tabular ${className ?? ''}`}>{inr(v)}</span>;
