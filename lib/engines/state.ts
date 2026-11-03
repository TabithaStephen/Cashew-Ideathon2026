// Trade state machine (Blueprint 11.7). REAL. One function owns all status changes.
import type { CheckResult, Trade, TradeStatus } from '../types';

export const ALLOWED: Record<TradeStatus, TradeStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['VERIFYING', 'WITHDRAWN'],
  VERIFYING: ['NEEDS_INFO', 'VERIFIED', 'REJECTED_VERIFICATION', 'WITHDRAWN'],
  NEEDS_INFO: ['VERIFYING', 'WITHDRAWN'],
  VERIFIED: ['OFFERS_OPEN', 'VERIFYING', 'WITHDRAWN'],
  OFFERS_OPEN: ['OFFER_ACCEPTED', 'WITHDRAWN'],
  OFFER_ACCEPTED: ['CONTRACT_SIGNED', 'WITHDRAWN'],
  CONTRACT_SIGNED: ['FINANCED'],
  FINANCED: ['SHIPMENT_IN_TRANSIT', 'DELIVERED', 'DISPUTED'],
  SHIPMENT_IN_TRANSIT: ['DELIVERED', 'DISPUTED'],
  DELIVERED: ['BUYER_ACCEPTED', 'DISPUTED'],
  BUYER_ACCEPTED: ['REPAID', 'DEFAULTED'],
  REPAID: ['CLOSED'],
  CLOSED: [],
  REJECTED_VERIFICATION: [],
  WITHDRAWN: [],
  DISPUTED: ['BUYER_ACCEPTED', 'DEFAULTED'],
  DEFAULTED: [],
};

export const MINIMUM_CHECKS = [1, 2, 5, 8, 12, 14];

export class TransitionError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

export interface TransitionContext {
  /** Latest result per check id (needed for the OFFERS_OPEN rule). */
  checkResults?: Record<number, CheckResult>;
  audit: (actor: string, action: string, object: string, meta?: unknown) => void;
  now?: string;
}

/** Minimum checks must pass, or be explicitly flagged to lenders (unknown/pending/failed-and-flagged). */
export function minimumChecksSatisfied(trade: Trade, results: Record<number, CheckResult>): { ok: boolean; missing: number[] } {
  const missing = MINIMUM_CHECKS.filter((id) => results[id] !== 'pass' && !trade.flaggedUnknownOrFailed.includes(id));
  return { ok: missing.length === 0, missing };
}

export function transition(trade: Trade, to: TradeStatus, actor: string, ctx: TransitionContext): Trade {
  const from = trade.status;
  if (from === to) return trade; // idempotent
  if (!ALLOWED[from].includes(to)) {
    throw new TransitionError('ILLEGAL_TRANSITION', `Cannot move trade ${trade.id} from ${from} to ${to}.`);
  }
  if (to === 'OFFERS_OPEN') {
    const { ok, missing } = minimumChecksSatisfied(trade, ctx.checkResults ?? {});
    if (!ok) throw new TransitionError('MINIMUM_CHECKS', `Checks ${missing.join(', ')} must pass or be flagged to lenders before opening to lenders.`);
  }
  trade.status = to;
  trade.updatedAt = ctx.now ?? new Date().toISOString();
  ctx.audit(actor, 'trade.status_changed', trade.id, { from, to });
  return trade;
}
