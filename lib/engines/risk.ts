// Risk profile / evidence strength (Blueprint 11.2). REAL. Never called a "score" in lender copy.
import type { Band, CheckResult, ComponentKey, RiskProfile } from '../types';

export const RULE_VERSION = 'rules-v0.1';
export const COMPONENTS: { key: ComponentKey; label: string; max: number; checks: Record<number, number>; terms?: number }[] = [
  { key: 'entity', label: 'Entity health', max: 30, checks: { 1: 10, 2: 5, 3: 7, 4: 8 } },
  { key: 'txn', label: 'Transaction authenticity', max: 40, checks: { 5: 10, 6: 8, 7: 6, 8: 10, 12: 6 } },
  { key: 'buyer', label: 'Buyer risk', max: 20, checks: { 9: 6, 10: 4, 11: 4, 14: 6 } },
  { key: 'struct', label: 'Structure', max: 10, checks: { 13: 5 }, terms: 5 },
];
export const BLOCKING_CHECKS = [5, 8, 10, 12];
export const DEFAULT_WEIGHTS = [1, 1, 1, 1];

/** Points per check: Pass = full, Unknown/Pending/Warn = 40%, Fail = 0. */
export function pointsFor(result: CheckResult | undefined, weight: number): number {
  switch (result) {
    case 'pass': return weight;
    case 'fail': return 0;
    default: return weight * 0.4; // unknown, pending, warn, or not yet run
  }
}

export function bandFor(strength: number): Band {
  return strength >= 80 ? 'Strong' : strength >= 60 ? 'Moderate' : 'Limited';
}
export const riskBandFor = (b: Band) => (b === 'Strong' ? 'Low' : b === 'Moderate' ? 'Medium' : 'High') as RiskProfile['riskBand'];

export function computeRiskProfile(
  tradeId: string, results: Record<number, CheckResult>, paymentTermsDays: number,
  weights: number[] = DEFAULT_WEIGHTS, now = new Date().toISOString(),
): RiskProfile {
  const components = {} as Record<ComponentKey, number>;
  const componentMax = {} as Record<ComponentKey, number>;
  let num = 0, den = 0;
  COMPONENTS.forEach((c, i) => {
    let earned = 0;
    for (const [id, w] of Object.entries(c.checks)) earned += pointsFor(results[Number(id)], w);
    if (c.terms) earned += paymentTermsDays <= 90 ? c.terms : 2;
    components[c.key] = round1(earned);
    componentMax[c.key] = c.max;
    const w = clampW(weights[i]);
    num += w * c.max * (earned / c.max);
    den += w * c.max;
  });
  const strength = den === 0 ? 0 : round1((100 * num) / den);
  const blocking = BLOCKING_CHECKS.filter((id) => results[id] === 'fail');
  let band = bandFor(strength);
  if (blocking.length) band = 'Limited';
  return {
    tradeId, strength, band, riskBand: riskBandFor(band), components, componentMax, blocking,
    weights: weights.map(clampW), ruleVersion: RULE_VERSION, computedAt: now, inputs: { ...results },
  };
}

const clampW = (w: number | undefined) => Math.min(2, Math.max(0, Number.isFinite(w) ? Number(w) : 1));
const round1 = (x: number) => Math.round(x * 10) / 10;
