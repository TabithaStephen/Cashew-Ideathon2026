// Money display (Indian grouping). Calculations stay unrounded; only display rounds.

// Round half to even, so an exact .5 doesn't always drift upward across a column.
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (Math.abs(diff - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(value);
}

export function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(roundHalfEven(value))}`;
}

// Prose form: ₹22.31 lakh, ₹1.2 crore.
export function formatINRShort(value: number): string {
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (value >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} crore`;
  if (value >= 1_00_000) return `₹${trim(value / 1_00_000)} lakh`;
  return formatINR(value);
}

export function formatUSD(value: number): string {
  return `USD ${new Intl.NumberFormat('en-IN').format(value)}`;
}

export function formatExportValue(usd: number, fx: number): string {
  return `${formatUSD(usd)} (${formatINR(usd * fx)} @ ${fx.toFixed(2)})`;
}

// 7f3a91c2...c91e. Anything already short enough is left whole.
export function truncateHash(hash: string): string {
  return hash.length <= 15 ? hash : `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}
