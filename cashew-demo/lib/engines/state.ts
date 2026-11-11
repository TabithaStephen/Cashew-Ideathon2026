// Trade state machine (Blueprint Section 11.7). transition() owns every status change.
import type { ConsentArtefact, Trade, TradeStatus, VerificationCheck } from '@/lib/types';

const ALLOWED: Record<TradeStatus, TradeStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['VERIFYING', 'WITHDRAWN'],
  VERIFYING: ['NEEDS_INFO', 'VERIFIED', 'REJECTED_VERIFICATION'],
  NEEDS_INFO: ['VERIFYING', 'VERIFIED', 'REJECTED_VERIFICATION', 'WITHDRAWN'],
  VERIFIED: ['VERIFYING', 'OFFERS_OPEN', 'WITHDRAWN'],
  OFFERS_OPEN: ['OFFER_ACCEPTED', 'WITHDRAWN'],
  OFFER_ACCEPTED: ['CONTRACT_SIGNED', 'WITHDRAWN'],
  CONTRACT_SIGNED: ['FINANCED', 'DISPUTED'],
  FINANCED: ['SHIPMENT_IN_TRANSIT', 'DISPUTED', 'DEFAULTED'],
  SHIPMENT_IN_TRANSIT: ['DELIVERED', 'DISPUTED', 'DEFAULTED'],
  DELIVERED: ['BUYER_ACCEPTED', 'DISPUTED', 'DEFAULTED'],
  BUYER_ACCEPTED: ['REPAID', 'DISPUTED', 'DEFAULTED'],
  REPAID: ['CLOSED'],
  CLOSED: [],
  REJECTED_VERIFICATION: [],
  WITHDRAWN: [],
  DISPUTED: [],
  DEFAULTED: [],
};

export const MINIMUM_CHECKS = [1, 2, 5, 8, 12, 14];

export class IllegalTransition extends Error {
  code = 'ILLEGAL_TRANSITION';
}

export function latestChecks(checks: VerificationCheck[], tradeId: string): Map<number, VerificationCheck> {
  const latest = new Map<number, VerificationCheck>();
  for (const check of checks) if (check.tradeId === tradeId) latest.set(check.checkId, check);
  return latest;
}

/** Minimum checks that have neither passed nor been flagged to lenders. */
export function unmetMinimumChecks(trade: Trade, checks: VerificationCheck[]): number[] {
  const latest = latestChecks(checks, trade.id);
  return MINIMUM_CHECKS.filter((id) => latest.get(id)?.result !== 'pass' && !trade.flaggedUnknownOrFailed.includes(id));
}

export interface TransitionContext {
  checks: VerificationCheck[];
  now: string;
  audit: (actor: string, action: string, object: string, meta?: unknown) => void;
}

export function transition(trade: Trade, to: TradeStatus, actor: string, ctx: TransitionContext): void {
  if (!ALLOWED[trade.status].includes(to)) {
    throw new IllegalTransition(`A trade can't move from ${trade.status} to ${to}.`);
  }
  if (to === 'OFFERS_OPEN') {
    const unmet = unmetMinimumChecks(trade, ctx.checks);
    if (unmet.length > 0) {
      throw new IllegalTransition(`Checks ${unmet.join(', ')} must pass or be flagged to lenders first.`);
    }
  }
  const from = trade.status;
  trade.status = to;
  trade.updatedAt = ctx.now;
  ctx.audit(actor, 'trade.status.changed', trade.id, { from, to });
}

export function hasActiveConsent(consents: ConsentArtefact[], lenderId: string, tradeId: string, now: string): boolean {
  return consents.some(
    (c) => c.recipientOrgId === lenderId && c.scope === `trade:${tradeId}` && !c.revokedAt && c.expiresAt > now,
  );
}
