// Fuzzy duplicate matching (Blueprint Section 11.4). Pure, so it runs on server or client.

export interface InvoiceFacts {
  invoiceNo: string;
  amount: number;
  date: string; // ISO date
  currency: string;
  irn?: string;
}

export interface SimilaritySignal {
  key: 'invoiceNo' | 'amount' | 'date' | 'currency' | 'irn';
  weight: number;
  closeness: number; // 0 to 1
  points: number; // weight × closeness
}

export const DUPLICATE_THRESHOLD = 0.8;

export function levenshtein(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const DAY_MS = 86_400_000;

export function similarity(attempt: InvoiceFacts, financed: InvoiceFacts) {
  const longer = Math.max(attempt.invoiceNo.length, financed.invoiceNo.length);
  const amountGapPct = (Math.abs(attempt.amount - financed.amount) / financed.amount) * 100;
  const dayGap = Math.abs(Date.parse(attempt.date) - Date.parse(financed.date)) / DAY_MS;

  const raw: Array<[SimilaritySignal['key'], number, number]> = [
    ['invoiceNo', 0.3, 1 - levenshtein(attempt.invoiceNo, financed.invoiceNo) / longer],
    ['amount', 0.3, clamp(1 - (amountGapPct - 1) / 9)],
    ['date', 0.2, clamp(1 - dayGap / 14)],
    ['currency', 0.1, attempt.currency === financed.currency ? 1 : 0],
    ['irn', 0.1, attempt.irn && attempt.irn === financed.irn ? 1 : 0],
  ];
  const signals: SimilaritySignal[] = raw.map(([key, weight, closeness]) => ({
    key,
    weight,
    closeness,
    points: weight * closeness,
  }));
  const score = signals.reduce((sum, s) => sum + s.points, 0);
  return { signals, score, flagged: score >= DUPLICATE_THRESHOLD };
}
