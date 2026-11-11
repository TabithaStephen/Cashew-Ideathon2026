// Risk profile (Blueprint Section 11.2). Pure and REAL; the lender sliders run this in the browser.
// In the interface this is "evidence strength" or "risk profile".
import type { CheckResult, RiskComponent, RiskProfile } from '@/lib/types';

export const RULE_VERSION = 'rules-v0.1';
export const BLOCKING_CHECKS = [5, 8, 10, 12];
export const COMPONENT_NAMES: RiskComponent[] = ['Entity health', 'Transaction authenticity', 'Buyer risk', 'Structure'];

const COMPONENTS: Array<{ name: RiskComponent; max: number; checks: Array<[number, number]> }> = [
  { name: 'Entity health', max: 30, checks: [[1, 10], [2, 5], [3, 7], [4, 8]] },
  { name: 'Transaction authenticity', max: 40, checks: [[5, 10], [6, 8], [7, 6], [8, 10], [12, 6]] },
  { name: 'Buyer risk', max: 20, checks: [[9, 6], [10, 4], [11, 4], [14, 6]] },
  { name: 'Structure', max: 10, checks: [[13, 5]] },
];

const points = (result: CheckResult | undefined, weight: number) =>
  result === 'pass' ? weight : result === 'fail' ? 0 : weight * 0.4;

export function computeRisk(
  tradeId: string,
  results: Map<number, CheckResult> | Record<number, CheckResult>,
  paymentTermsDays: number,
  weights: number[] = [1, 1, 1, 1],
  now = new Date().toISOString(),
): RiskProfile {
  const read = (id: number) => (results instanceof Map ? results.get(id) : results[id]);
  const earned = COMPONENTS.map((component) => {
    let total = component.checks.reduce((sum, [id, weight]) => sum + points(read(id), weight), 0);
    if (component.name === 'Structure') total += paymentTermsDays <= 90 ? 5 : 2;
    return total;
  });
  const numerator = COMPONENTS.reduce((sum, c, i) => sum + weights[i] * c.max * (earned[i] / c.max), 0);
  const denominator = COMPONENTS.reduce((sum, c, i) => sum + weights[i] * c.max, 0);
  const strength = denominator === 0 ? 0 : (100 * numerator) / denominator;
  const blocking = BLOCKING_CHECKS.filter((id) => read(id) === 'fail');
  const band = blocking.length > 0 ? 'Limited' : strength >= 80 ? 'Strong' : strength >= 60 ? 'Moderate' : 'Limited';
  return {
    tradeId,
    strength: Math.round(strength * 10) / 10,
    band,
    riskBand: band === 'Strong' ? 'Low' : band === 'Moderate' ? 'Medium' : 'High',
    components: Object.fromEntries(COMPONENTS.map((c, i) => [c.name, Math.round((earned[i] / c.max) * 1000) / 10])) as Record<RiskComponent, number>,
    blocking,
    weights,
    ruleVersion: RULE_VERSION,
    computedAt: now,
  };
}
