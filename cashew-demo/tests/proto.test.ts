import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INVOICE_VALUE_INR, offers } from '@/app/proto/_lib/data';
import { strings } from '@/app/proto/_lib/strings';
import { similarity } from '@/lib/engines/fuzzy';
import { normaliseOffer } from '@/lib/engines/matching';
import { formatExportValue, formatINR, formatINRShort, truncateHash } from '@/lib/format';

const normalised = (id: string) => {
  const offer = offers.find((o) => o.id === id)!;
  return normaliseOffer({
    invoiceValue: INVOICE_VALUE_INR,
    advancePct: offer.advancePct,
    ratePct: offer.ratePct,
    tenureDays: offer.tenureDays,
    fees: offer.fees,
  });
};

describe('offer maths (Blueprint 6.5 fixtures)', () => {
  it.each([
    ['banyan', '13.53', '₹18,96,562', '₹9,483', '₹53,779', '₹63,262', '₹18,87,080'],
    ['meridian', '12.93', '₹17,85,000', '₹4,462', '₹45,774', '₹56,930', '₹17,73,844'],
  ])('%s', (id, apr, advance, firstFee, interest, total, net) => {
    const n = normalised(id);
    expect(n.effectiveApr.toFixed(2)).toBe(apr);
    expect(formatINR(n.advance)).toBe(advance);
    expect(formatINR(n.feeLines[0].amount)).toBe(firstFee);
    expect(formatINR(n.interest)).toBe(interest);
    expect(formatINR(n.totalCost)).toBe(total);
    expect(formatINR(n.netCash)).toBe(net);
  });

  it('tidewater', () => {
    const n = normalised('tidewater');
    expect(n.effectiveApr.toFixed(2)).toBe('16.58');
    expect(formatINR(n.advance)).toBe('₹20,08,125');
    expect(formatINR(n.interest)).toBe('₹50,506');
    expect(formatINR(n.feeLines[2].amount)).toBe('₹16,065');
    expect(n.feeLines[2].hidden).toBe(true);
    expect(formatINR(n.netCash)).toBe('₹19,76,511');
    // The exact total is 82,119.47. The rounded lines add up to 82,120, which is why
    // the calculation view says totals use exact values.
    expect(formatINR(n.totalCost)).toBe('₹82,119');
  });

  it('default order is Meridian, Banyan, Tidewater by effective cost', () => {
    const order = ['banyan', 'tidewater', 'meridian'].sort((a, b) => normalised(a).effectiveApr - normalised(b).effectiveApr);
    expect(order).toEqual(['meridian', 'banyan', 'tidewater']);
  });

  it('commission is not in the offer data', () => {
    expect(JSON.stringify(offers).toLowerCase()).not.toContain('commission');
  });
});

describe('duplicate similarity (Blueprint 11.4 fixture)', () => {
  const irn = 'abc';
  const financed = { invoiceNo: 'CKS/2627/0188', amount: 18400, date: '2026-09-14', currency: 'USD', irn };
  const altered = { invoiceNo: 'CKS/2627/0188-A', amount: 18900, date: '2026-09-16', currency: 'USD', irn };

  it('flags the altered copy at about 0.87', () => {
    const result = similarity(altered, financed);
    expect(result.score).toBeCloseTo(0.87, 1);
    expect(result.flagged).toBe(true);
  });

  it('would not flag without the reused IRN (about 0.77)', () => {
    const result = similarity({ ...altered, irn: undefined }, financed);
    expect(result.score).toBeCloseTo(0.77, 1);
    expect(result.flagged).toBe(false);
  });
});

describe('money format', () => {
  it('uses Indian grouping, both currencies and lakh/crore in prose', () => {
    expect(formatINR(2231250)).toBe('₹22,31,250');
    expect(formatExportValue(26250, 85)).toBe('USD 26,250 (₹22,31,250 @ 85.00)');
    expect(formatINRShort(2231250)).toBe('₹22.31 lakh');
    expect(formatINRShort(12000000)).toBe('₹1.2 crore');
  });
});

describe('strings', () => {
  it('every language has every key, with no blanks', () => {
    const keys = Object.keys(strings.en).sort();
    for (const lang of ['hi', 'ta'] as const) {
      expect(Object.keys(strings[lang]).sort()).toEqual(keys);
      for (const key of keys) expect(strings[lang][key as keyof typeof strings.en].trim()).not.toBe('');
    }
  });

  it('English copy avoids the banned words, and the risk output is never a score', () => {
    const copy = Object.values(strings.en).join(' ').toLowerCase();
    for (const word of ['revolutionise', 'seamless', 'unlock', 'oops', 'score']) expect(copy).not.toContain(word);
  });
});

describe('Manifest token contrast (WCAG AA 4.5:1)', () => {
  const css = readFileSync(path.resolve(__dirname, '../app/tokens.css'), 'utf8');
  const token = (name: string) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(token(a)), lum(token(b))].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each([
    ['ink', 'accent'], ['ink', 'accent-press'], ['ink', 'paper'], ['ink-2', 'paper'], ['ink-3', 'paper'], ['ink-3', 'sheet'],
    ['pass', 'pass-soft'], ['fail', 'fail-soft'], ['warn', 'warn-soft'], ['unknown', 'unknown-soft'], ['pending', 'pending-soft'],
    ['pass', 'sheet'], ['fail', 'sheet'], ['warn', 'sheet'], ['sheet', 'fail'], ['sheet', 'warn'], ['sheet', 'fail-press'], ['unknown', 'sheet'], ['pending', 'sheet'], ['ink-2', 'sheet'],
  ])('%s on %s', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('truncateHash', () => {
  it('keeps the first 8 and last 4 characters', () => {
    expect(truncateHash('7f3a91c2d04e8b6a15f7c3e9a2d06b4f8e1c7a93b5d2064fe8a1c37b90d2c91e')).toBe('7f3a91c2...c91e');
  });
  it('leaves a short value whole', () => {
    expect(truncateHash('abc123')).toBe('abc123');
  });
});
