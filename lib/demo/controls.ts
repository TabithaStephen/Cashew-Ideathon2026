// Demo controls (Blueprint 10.4). Every control is idempotent.
import { audit, findTrade, nowIso, reset } from '../store';
import type { DemoState, ScenarioId, Session, Trade } from '../types';
import { DOC_TYPES } from '../types';
import { SAMPLES } from '../seed/scenarios';
import {
  ApiError, acceptOffer, advanceShipment, advanceToRepayment, buyerConfirms, createTrade, focusTrade, requestOffers,
  signOffer, startVerification, tick, uploadDocument,
} from '../service';

const FINANCED_STATES = ['FINANCED', 'SHIPMENT_IN_TRANSIT', 'DELIVERED', 'BUYER_ACCEPTED'];

/** Build Kaveri's Scenario B trade straight to FINANCED (start state for Scenario C, which follows B in the script). */
export async function fastForwardB(s: DemoState, lenderId: string): Promise<Trade> {
  const sess: Session = { role: 'exporter', orgId: 'org_kaveri' };
  const speed = s.speed; s.speed = 0;
  try {
    const t = createTrade(s, sess, { sample: 'B' });
    for (const type of DOC_TYPES) uploadDocument(s, sess, t.id, { type, fileName: SAMPLES.B.fileNames[type], bytes: new TextEncoder().encode(`sample:${SAMPLES.B.fileNames[type]}`) });
    uploadDocument(s, sess, t.id, { type: 'invoice', fileName: 'B-commercial-invoice-amended.pdf', bytes: new TextEncoder().encode('sample:B-commercial-invoice-amended.pdf'), amended: true });
    await buyerConfirms(s, t);
    await startVerification(s, sess, t.id);
    requestOffers(s, sess, t.id);
    await tick(s);
    const offer = s.offers.find((o) => o.tradeId === t.id && o.lenderId === lenderId) ?? s.offers.find((o) => o.tradeId === t.id)!;
    acceptOffer(s, sess, offer.id);
    signOffer(s, sess, offer.id, '000000');
    await tick(s);
    return t;
  } finally { s.speed = speed; }
}

export async function resetScenario(prev: DemoState | null, scenario: ScenarioId): Promise<DemoState> {
  // Scenario C follows B in the run-of-show: carry over the lender the presenter actually chose.
  let lenderId = 'lender_meridian';
  if (prev) {
    const b = [...prev.trades].reverse().find((t) => !t.historical && t.smeId === 'org_kaveri' && t.acceptedOfferId && FINANCED_STATES.concat(['REPAID', 'CLOSED']).includes(t.status));
    const o = b && prev.offers.find((x) => x.id === b.acceptedOfferId);
    if (o) lenderId = o.lenderId;
  }
  const s = reset(scenario);
  if (scenario === 'C') {
    await fastForwardB(s, lenderId);
    s.notifications = [];
    audit(s, 'system', 'demo.scenario_prepared', 'scenario:C', { carriedOver: 'Kaveri Textiles Scenario B trade, financed', lenderId });
  }
  s.epoch = Date.now();
  return s;
}

export async function addDuplicateAttempt(s: DemoState, attempt: 1 | 2): Promise<Trade> {
  const existing = s.trades.find((t) => t.attempt === attempt && !['WITHDRAWN'].includes(t.status));
  if (existing) return existing; // idempotent
  const sess: Session = { role: 'exporter', orgId: 'org_cks' };
  const key = attempt === 1 ? 'C1' : 'C2';
  const t = createTrade(s, sess, { sample: key, attempt });
  for (const type of DOC_TYPES) uploadDocument(s, sess, t.id, { type, fileName: SAMPLES[key].fileNames[type], bytes: new TextEncoder().encode(`sample:${SAMPLES[key].fileNames[type]}`) });
  await startVerification(s, sess, t.id);
  return t;
}

export type AdvanceWhat = 'shipment' | 'buyer-confirm' | 'lenders-respond' | 'time-30d' | 'repaid' | 'duplicate-1' | 'duplicate-2';

export async function advance(s: DemoState, what: AdvanceWhat, tradeId?: string): Promise<{ message: string; tradeId?: string; smeId?: string }> {
  const pick = (pred?: (t: Trade) => boolean) => (tradeId ? findTrade(s, tradeId) : focusTrade(s, pred));
  switch (what) {
    case 'lenders-respond': {
      const n = s.offerRequests.filter((r) => r.status === 'requested');
      for (const r of n) r.dueAt = Date.now() + s.clockOffsetMs;
      await tick(s);
      audit(s, 'demo', 'demo.lenders_respond', '-', { count: n.length });
      return { message: n.length ? `${n.length} lender response(s) delivered.` : 'No lenders are waiting to respond.' };
    }
    case 'buyer-confirm': {
      const t = pick((x) => !x.buyerConfirmed && !['REPAID', 'CLOSED'].includes(x.status));
      if (!t) return { message: 'No trade is waiting for buyer confirmation.' };
      await buyerConfirms(s, t);
      return { message: `Buyer confirmed ${t.invoiceNo}.`, tradeId: t.id };
    }
    case 'shipment': {
      const t = pick((x) => FINANCED_STATES.includes(x.status)) ?? pick((x) => (x.shipmentStage ?? 0) < 4);
      if (!t) return { message: 'No trade to advance.' };
      await advanceShipment(s, t, 'demo');
      return { message: `Shipment for ${t.id} advanced.`, tradeId: t.id };
    }
    case 'time-30d': {
      s.clockOffsetMs += 30 * 86_400_000;
      audit(s, 'demo', 'demo.time_advanced', '-', { days: 30, demoNow: nowIso(s) });
      await tick(s);
      return { message: 'Advanced the demo clock by 30 days.' };
    }
    case 'repaid': {
      const t = pick((x) => FINANCED_STATES.includes(x.status));
      if (!t) {
        const done = focusTrade(s, (x) => x.status === 'REPAID');
        if (done) return { message: `${done.id} is already repaid.`, tradeId: done.id };
        throw new ApiError(409, 'NOT_FINANCED', 'No financed trade to repay yet.');
      }
      await advanceToRepayment(s, t);
      return { message: `${t.id} repaid on time. Passport updated.`, tradeId: t.id, smeId: t.smeId };
    }
    case 'duplicate-1':
    case 'duplicate-2': {
      const t = await addDuplicateAttempt(s, what === 'duplicate-1' ? 1 : 2);
      return { message: `Duplicate attempt ${what.slice(-1)} created as ${t.id}.`, tradeId: t.id };
    }
  }
}
