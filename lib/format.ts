/** Formatting helpers (Section 5.3): Indian grouping for rupees, code-prefixed foreign currency. */
export const FX_USD_INR = 85;

export function indianGroup(n: number, decimals = 0): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  let out = int;
  if (int.length > 3) {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    out = `${rest},${last3}`;
  }
  return (neg ? '-' : '') + out + (frac ? `.${frac}` : '');
}
/** Round half to even (banker's rounding): matches the Section 6.5 figures (e.g. ₹18,96,562.5 → ₹18,96,562). */
export function roundHalfEven(n: number, decimals = 0): number {
  const f = 10 ** decimals, x = n * f, r = Math.round(x);
  const isHalf = Math.abs(Math.abs(x % 1) - 0.5) < 1e-9;
  return (isHalf ? (Math.floor(x) % 2 === 0 ? Math.floor(x) : Math.floor(x) + 1) : r) / f;
}
export const inr = (n: number, decimals = 0) => `₹${indianGroup(roundHalfEven(n, decimals), decimals)}`;
export const intl = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const fcy = (n: number, ccy = 'USD') => `${ccy} ${intl(n, n % 1 ? 2 : 0)}`;
/** Export value with both currencies and the rate, e.g. "USD 30,000 (₹25,50,000 @ 85.00)". */
export const exportValue = (usd: number, fx = FX_USD_INR, ccy = 'USD') => `${fcy(usd, ccy)} (${inr(usd * fx)} @ ${fx.toFixed(2)})`;
export const pct = (n: number, d = 2) => `${(n * 100).toFixed(d)}%`;
export const qty = (n: number) => intl(n);

export function truncHash(h: string, head = 8, tail = 4) {
  if (!h) return '';
  return h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`;
}
export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
}
export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
