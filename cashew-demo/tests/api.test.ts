import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatch } from '@/lib/api/router';
import { transition, IllegalTransition, hasActiveConsent } from '@/lib/engines/state';
import { reset, db } from '@/lib/store';
import { DOC_TYPES } from '@/lib/seed/scenarios';
import type { Trade } from '@/lib/types';

const EXPORTER = 'exporter';
const BANYAN = 'lender:lender_banyan';
const TIDEWATER = 'lender:lender_tidewater';
const MERIDIAN = 'lender:lender_meridian';
const OPS = 'ops';

async function call(method: string, path: string, session?: string, body?: unknown) {
  const req = new Request(`http://test/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(session ? { cookie: `cashew_session=${encodeURIComponent(session)}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await dispatch(req, path.split('?')[0].split('/'));
  return { status: res.status, body: (await res.json()) as any };
}
const ok = async (method: string, path: string, session?: string, body?: unknown) => {
  const r = await call(method, path, session, body);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body;
};

const SAMPLE_B = { buyerId: 'buyer_northgate', goods: 'Cotton knit T-shirts', hsCode: '610910', value: 30000, incoterm: 'FOB', paymentTermsDays: 90, docSet: 'B' };

async function verifiedB() {
  const trade = await ok('POST', 'trades', EXPORTER, SAMPLE_B);
  for (const slot of DOC_TYPES) await ok('POST', `trades/${trade.id}/documents`, EXPORTER, { slot });
  await ok('POST', `trades/${trade.id}/verify`, EXPORTER, {});
  return trade.id as string;
}

beforeEach(async () => {
  reset('B');
  await ok('POST', 'demo/speed', undefined, { factor: 0 });
});

describe('state machine (11.7)', () => {
  const ctx = { checks: [], now: '2026-11-03T00:00:00Z', audit: vi.fn() };
  const fresh = (status: Trade['status']) => ({ id: 't', status, flaggedUnknownOrFailed: [] } as unknown as Trade);
  it('allows a legal move and audits it', () => {
    const t = fresh('DRAFT');
    transition(t, 'SUBMITTED', 'me', ctx);
    expect(t.status).toBe('SUBMITTED');
    expect(ctx.audit).toHaveBeenCalled();
  });
  it('throws on an illegal move and leaves the trade alone', () => {
    const t = fresh('DRAFT');
    expect(() => transition(t, 'FINANCED', 'me', ctx)).toThrow(IllegalTransition);
    expect(t.status).toBe('DRAFT');
  });
  it('refuses OFFERS_OPEN until minimum checks pass or are flagged', () => {
    const t = fresh('VERIFIED');
    expect(() => transition(t, 'OFFERS_OPEN', 'me', ctx)).toThrow(/must pass or be flagged/);
    t.flaggedUnknownOrFailed = [1, 2, 5, 8, 12, 14];
    transition(t, 'OFFERS_OPEN', 'me', ctx);
    expect(t.status).toBe('OFFERS_OPEN');
  });
  it('consent must be active, unexpired and unrevoked', () => {
    const c = { id: 'c', orgId: 'o', scope: 'trade:t', recipientOrgId: 'l', purpose: 'p', grantedAt: '2026-01-01', expiresAt: '2026-12-01' };
    expect(hasActiveConsent([c], 'l', 't', '2026-06-01')).toBe(true);
    expect(hasActiveConsent([c], 'other', 't', '2026-06-01')).toBe(false);
    expect(hasActiveConsent([c], 'l', 't', '2027-01-01')).toBe(false);
    expect(hasActiveConsent([{ ...c, revokedAt: '2026-02-01' }], 'l', 't', '2026-06-01')).toBe(false);
  });
});

describe('store', () => {
  it('reset restores seed in under a second', async () => {
    await verifiedB();
    const started = performance.now();
    reset('C');
    expect(performance.now() - started).toBeLessThan(1000);
    expect(db().trades.every((t) => t.history || t.seededRace)).toBe(true);
    expect(db().registry).toHaveLength(1);
  });
});

describe('Scenario B walk through the API (Phase 4)', () => {
  it('create → upload → verify → fix → consent → offers → accept → sign → registry commit', async () => {
    const id = await verifiedB();
    let evidence = await ok('GET', `trades/${id}/evidence`, EXPORTER);
    const check = (n: number) => evidence.checks.find((c: any) => c.checkId === n);
    expect(check(8).result).toBe('fail');
    expect(check(8).line).toBe('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.');
    expect(check(7).result).toBe('unknown');
    expect(check(14).result).toBe('pending');
    expect(evidence.summary).toEqual({ pass: 11, fail: 1, unknown: 1, pending: 1 });
    expect((await ok('GET', `trades/${id}`, EXPORTER)).status).toBe('NEEDS_INFO');
    expect((await ok('GET', `trades/${id}/risk-profile`, EXPORTER)).strength).toBe(82.8);

    await ok('POST', `trades/${id}/documents`, EXPORTER, { slot: 'invoice' });
    const fixed = await ok('GET', `trades/${id}`, EXPORTER);
    expect(fixed.value).toBe(26250);
    expect(fixed.valueInr).toBe(2231250);
    await ok('POST', `trades/${id}/verify`, EXPORTER, { checkId: 8 });
    evidence = await ok('GET', `trades/${id}/evidence`, EXPORTER);
    expect(evidence.checks.find((c: any) => c.checkId === 8).result).toBe('pass');
    expect(evidence.checks.find((c: any) => c.checkId === 8).versions).toBe(2);
    expect((await ok('GET', `trades/${id}`, EXPORTER)).status).toBe('VERIFIED');

    expect((await call('POST', `trades/${id}/offer-requests`, EXPORTER)).status).toBe(409); // Check 14 isn't flagged yet.
    await ok('POST', 'consents', EXPORTER, { tradeId: id, flagged: [14] });
    await ok('POST', `trades/${id}/offer-requests`, EXPORTER);
    const offers = await ok('GET', `trades/${id}/offers`, EXPORTER);
    expect(offers.offers.map((o: any) => o.lenderName)).toEqual(['Meridian Bank', 'Banyan Capital', 'Tidewater Finance']);
    expect(offers.offers.map((o: any) => o.effectiveApr.toFixed(2))).toEqual(['12.93', '13.53', '16.58']);
    const tidewater = offers.offers[2];
    expect(Math.round(tidewater.feeLines.find((l: any) => l.hidden).amount)).toBe(16065);
    expect(offers.badges.lowestCost).toBe(offers.offers[0].id);
    expect(offers.badges.fastest).toBe(tidewater.id);
    expect(offers.badges.mostCash).toBe(tidewater.id);

    await ok('POST', `offers/${tidewater.id}/accept`, EXPORTER);
    expect((await call('POST', `offers/${tidewater.id}/sign`, EXPORTER, { otp: '12' })).status).toBe(400);
    await ok('POST', `offers/${tidewater.id}/sign`, EXPORTER, { otp: '123456' });
    const financed = await ok('GET', `trades/${id}`, EXPORTER);
    expect(financed.status).toBe('FINANCED');
    expect(financed.commit.position).toBe(7);
    expect((await ok('POST', 'registry/verify-chain', OPS)).intact).toBe(true);

    await ok('POST', 'demo/advance', undefined, { what: 'repaid' });
    await ok('POST', 'demo/advance', undefined, { what: 'repaid' });
    const after = await ok('GET', `trades/${id}`, EXPORTER);
    expect(after.status).toBe('REPAID');
    const passport = (await ok('GET', 'passport/org_kaveri', EXPORTER)).passport;
    expect(passport.claims).toMatchObject({ tier: 3, completedTrades: 4 });
    expect((await ok('POST', 'registry/verify-chain', OPS)).entries).toBe(8);

    const { events } = await ok('GET', 'audit', OPS);
    const actions = new Set(events.map((e: any) => e.action));
    for (const action of ['trade.created', 'document.uploaded', 'document.extracted', 'verification.started', 'verification.check.completed', 'consent.granted', 'offers.requested', 'offer.submitted', 'ranking.computed', 'offer.accepted', 'contract.signed', 'registry.checked', 'registry.committed', 'shipment.advanced', 'repayment.received']) {
      expect(actions, action).toContain(action);
    }
  });

  it('flagging check 8 instead of fixing it goes to Ops and caps the band', async () => {
    const id = await verifiedB();
    await ok('POST', `trades/${id}/flag`, EXPORTER);
    const trade = await ok('GET', `trades/${id}`, EXPORTER);
    expect(trade.status).toBe('VERIFIED');
    expect(trade.flaggedUnknownOrFailed).toContain(8);
    expect(trade.band).toBe('Limited');
    expect((await ok('GET', 'ops/queue', OPS)).cases.map((c: any) => c.reason)).toContain('Check 8 failed and flagged');
  });
});

describe('access rules (13.4)', () => {
  it('needs a session', async () => {
    expect((await call('GET', 'trades')).status).toBe(401);
  });
  it('error responses use the documented shape', async () => {
    const r = await call('GET', 'trades');
    expect(r.body.error).toMatchObject({ code: 'NO_SESSION' });
    expect(typeof r.body.error.message).toBe('string');
  });
  it('a lender without consent gets nothing, and revoking removes access', async () => {
    const id = await verifiedB();
    await ok('POST', `trades/${id}/documents`, EXPORTER, { slot: 'invoice' });
    await ok('POST', `trades/${id}/verify`, EXPORTER, { checkId: 8 });
    expect((await ok('GET', 'trades', BANYAN)).trades).toEqual([]);
    expect((await call('GET', `trades/${id}`, BANYAN)).status).toBe(403);
    expect((await call('GET', `trades/${id}/evidence`, BANYAN)).body.error.code).toBe('CONSENT_REQUIRED');

    const { consents } = await ok('POST', 'consents', EXPORTER, { tradeId: id, flagged: [14] });
    expect((await ok('GET', 'trades', BANYAN)).trades).toHaveLength(1);
    await ok('GET', `trades/${id}/evidence`, BANYAN);

    const banyan = consents.find((c: any) => c.recipientOrgId === 'lender_banyan');
    await ok('DELETE', `consents/${banyan.id}`, EXPORTER);
    expect((await ok('GET', 'trades', BANYAN)).trades).toEqual([]);
    expect((await ok('GET', 'trades', TIDEWATER)).trades).toHaveLength(1);
  });
  it('a lender cannot act as an exporter or read Ops data', async () => {
    const id = await verifiedB();
    expect((await call('POST', 'trades', BANYAN, SAMPLE_B)).status).toBe(403);
    expect((await call('POST', `trades/${id}/flag`, BANYAN)).status).toBe(403);
    expect((await call('GET', 'audit', BANYAN)).status).toBe(403);
    expect((await call('GET', 'registry/entries', EXPORTER)).status).toBe(403);
  });
});

async function openB() {
  const id = await verifiedB();
  await ok('POST', `trades/${id}/documents`, EXPORTER, { slot: 'invoice' });
  await ok('POST', `trades/${id}/verify`, EXPORTER, { checkId: 8 });
  await ok('POST', 'consents', EXPORTER, { tradeId: id, flagged: [14] });
  await ok('POST', 'demo/speed', undefined, { factor: 1 });
  await ok('POST', `trades/${id}/offer-requests`, EXPORTER);
  return id;
}

describe('sealed offers (11.5)', () => {
  const live = { productName: 'Live', advancePct: 80, ratePct: 9, tenureDays: 90, fees: [], recourse: true, collateral: 'None', conditions: '', disbursalHours: 24, validityDays: 3 };
  it('a lender only ever sees its own offer, even after acceptance', async () => {
    const id = await openB();
    await ok('POST', 'offers', BANYAN, { ...live, tradeId: id });
    await ok('POST', 'offers', TIDEWATER, { ...live, tradeId: id, ratePct: 8 });
    const seen = await ok('GET', `trades/${id}/offers`, BANYAN);
    expect(seen.offers).toHaveLength(1);
    expect(seen.offers[0].lenderName).toBe('Banyan Capital');
    expect(JSON.stringify(seen)).not.toContain('Tidewater');

    const all = await ok('GET', `trades/${id}/offers`, EXPORTER);
    await ok('POST', `offers/${all.offers.find((o: any) => o.lenderName === 'Tidewater Finance').id}/accept`, EXPORTER);
    const after = await ok('GET', `trades/${id}/offers`, BANYAN);
    expect(after.offers.map((o: any) => o.lenderName)).toEqual(['Banyan Capital']);
    const row = await ok('GET', `trades/${id}`, BANYAN);
    expect(row.acceptedOffer).toBeUndefined();
    expect(JSON.stringify(row)).not.toContain('"ratePct":8');
  });
  it('a typed offer replaces the scripted one for that lender', async () => {
    const id = await openB();
    await ok('POST', 'offers', BANYAN, { ...live, tradeId: id });
    await ok('POST', 'demo/advance', undefined, { what: 'lenders-respond' });
    const { offers } = await ok('GET', `trades/${id}/offers`, EXPORTER);
    expect(offers.filter((o: any) => o.lenderName === 'Banyan Capital')).toHaveLength(1);
    expect(offers.find((o: any) => o.lenderName === 'Banyan Capital').scripted).toBe(false);
  });
  it('lenders arrive on the 4, 8 and 12 second timers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const id = await openB();
      const names = async () => (await ok('GET', `trades/${id}/offers`, EXPORTER)).offers.map((o: any) => o.lenderName);
      expect(await names()).toEqual([]);
      vi.advanceTimersByTime(4100);
      expect(await names()).toEqual(['Tidewater Finance']);
      vi.advanceTimersByTime(4000);
      expect(await names()).toEqual(['Banyan Capital', 'Tidewater Finance']);
      vi.advanceTimersByTime(4000);
      expect(await names()).toEqual(['Meridian Bank', 'Banyan Capital', 'Tidewater Finance']);
    } finally {
      vi.useRealTimers();
    }
  });
  it('narrowing Meridian\'s ticket range removes it from the next request', async () => {
    const { products } = await ok('GET', 'lender/products', MERIDIAN);
    await ok('PATCH', `lender/products/${products[0].id}`, MERIDIAN, { maxTicket: 1000000 });
    const id = await verifiedB();
    await ok('POST', `trades/${id}/documents`, EXPORTER, { slot: 'invoice' });
    await ok('POST', `trades/${id}/verify`, EXPORTER, { checkId: 8 });
    await ok('POST', 'consents', EXPORTER, { tradeId: id, flagged: [14] });
    const { eligibility } = await ok('POST', `trades/${id}/offer-requests`, EXPORTER);
    expect(eligibility.find((e: any) => e.lenderName === 'Meridian Bank').eligible).toBe(false);
    expect((await ok('GET', 'trades', MERIDIAN)).trades).toEqual([]);
    expect((await ok('GET', 'ops/matching', OPS)).trades[0].eligibility.find((e: any) => e.lenderName === 'Meridian Bank').reasons[0]).toContain('outside the range');
  });
});

describe('Scenario C (11.4, 9.2)', () => {
  beforeEach(async () => {
    await ok('POST', 'demo/scenario', undefined, { id: 'C' });
  });
  it('attempt 1 blocks and never names the lender', async () => {
    const { tradeId } = await ok('POST', 'demo/advance', undefined, { what: 'duplicate-1' });
    const evidence = await ok('GET', `trades/${tradeId}/evidence`, EXPORTER);
    const c12 = evidence.checks.find((c: any) => c.checkId === 12);
    expect(c12.result).toBe('fail');
    expect(c12.line).toBe('This invoice has already been financed through Cashew. Details are not shared.');
    expect((await ok('GET', `trades/${tradeId}`, EXPORTER)).status).toBe('REJECTED_VERIFICATION');
    expect(JSON.stringify(evidence).toLowerCase()).not.toContain('banyan');
    expect(c12.evidence.fingerprint).toBe(c12.evidence.matchedFingerprint);
    expect((await ok('POST', 'demo/advance', undefined, { what: 'duplicate-1' })).tradeId).toBe(tradeId);
  });
  it('attempt 2 flags about 0.87, and Ops can clear it or confirm it', async () => {
    const { tradeId } = await ok('POST', 'demo/advance', undefined, { what: 'duplicate-2' });
    const evidence = await ok('GET', `trades/${tradeId}/evidence`, EXPORTER);
    const c12 = evidence.checks.find((c: any) => c.checkId === 12);
    expect(c12.flag).toBe('possible-duplicate');
    expect(c12.evidence.similarity.overall).toBeCloseTo(0.87, 2);
    expect(JSON.stringify(c12).toLowerCase()).not.toContain('banyan');
    expect((await call('POST', `trades/${tradeId}/flag`, EXPORTER)).status).toBe(409);
    await ok('POST', `trades/${tradeId}/ops-review`, EXPORTER);
    const { cases } = await ok('GET', 'ops/queue', OPS);
    const item = cases.find((c: any) => c.reason === 'Possible duplicate');
    expect((await call('POST', `ops/queue/${item.id}/decision`, OPS, { decision: 'confirm-duplicate', note: ' ' })).status).toBe(400);
    await ok('POST', `ops/queue/${item.id}/decision`, OPS, { decision: 'confirm-duplicate', note: 'Same IRN, tweaked number.' });
    expect((await ok('GET', `trades/${tradeId}`, EXPORTER)).status).toBe('REJECTED_VERIFICATION');
    expect((await ok('GET', 'audit', OPS)).events.find((e: any) => e.action === 'ops.decision').meta.humanOverride).toBe(true);
  });
  it('the second lender is blocked at Commit, with no lender identity', async () => {
    const seeded = (await ok('GET', 'trades', TIDEWATER)).trades[0];
    expect(seeded.status).toBe('CONTRACT_SIGNED');
    const blocked = await call('POST', 'registry/commit', TIDEWATER, { tradeId: seeded.id });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('REGISTRY_BLOCKED');
    expect(JSON.stringify(blocked.body).toLowerCase()).not.toContain('banyan');
  });
  it('registry reads mask lenders, and a check returns codes only', async () => {
    const view = await ok('GET', 'registry/entries', TIDEWATER);
    expect(view.entries[0].lender).toBe('Lender #1');
    expect(JSON.stringify(view).toLowerCase()).not.toContain('banyan');
    const check = await ok('POST', 'registry/check', TIDEWATER, { sample: 'exact' });
    expect(check.code).toBe('FINANCED_BY_OTHER');
    expect(JSON.stringify(check).toLowerCase()).not.toContain('banyan');
    expect((await ok('POST', 'registry/check', TIDEWATER, { sample: 'altered' })).code).toBe('POSSIBLE_DUPLICATE');
  });
});

describe('verification at 1x speed (7.5, 10.2)', () => {
  it('checks finish one at a time, over about 12 seconds, then settle', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      await ok('POST', 'demo/speed', undefined, { factor: 1 });
      const trade = await ok('POST', 'trades', EXPORTER, SAMPLE_B);
      for (const slot of DOC_TYPES) await ok('POST', `trades/${trade.id}/documents`, EXPORTER, { slot });
      await ok('POST', `trades/${trade.id}/verify`, EXPORTER, {});
      const done = async () => (await ok('GET', `trades/${trade.id}/evidence`, EXPORTER)).checks.filter((c: any) => c.state === 'done').length;
      expect(await done()).toBe(0);
      const seen: number[] = [];
      for (let i = 0; i < 12; i++) {
        vi.advanceTimersByTime(1000);
        seen.push(await done());
      }
      expect(seen[0]).toBe(1);
      expect(seen.every((n, i) => i === 0 || n >= seen[i - 1])).toBe(true);
      expect(seen[11]).toBe(14);
      expect((await ok('GET', `trades/${trade.id}`, EXPORTER)).status).toBe('NEEDS_INFO');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('closing beat of the run of show (10.1)', () => {
  it('Advance to repayment in Scenario C finishes Kaveri, moving the Passport from 3 to 4 trades', async () => {
    await ok('POST', 'demo/scenario', undefined, { id: 'C' });
    await ok('POST', 'demo/advance', undefined, { what: 'duplicate-1' });
    expect((await ok('GET', 'passport/org_cks', EXPORTER)).passport.claims.completedTrades).toBe(3);
    await ok('POST', 'demo/advance', undefined, { what: 'repaid' });
    const { passport } = await ok('GET', 'passport/org_kaveri', EXPORTER);
    expect(passport.claims).toMatchObject({ tier: 3, completedTrades: 4, repaidOnTime: 4 });
    expect((await ok('POST', 'registry/verify-chain', OPS)).intact).toBe(true);
    expect((await ok('GET', 'demo/state')).speed).toBe(0);
  });
});

describe('demo controls are idempotent (10.3)', () => {
  it('survives every control being pressed twice with no trade, then with one', async () => {
    for (const what of ['shipment', 'buyer-confirm', 'lenders-respond', 'repaid']) {
      expect((await ok('POST', 'demo/advance', undefined, { what })).ok).toBe(false);
    }
    const id = await openB();
    for (const what of ['buyer-confirm', 'buyer-confirm', 'lenders-respond', 'lenders-respond', 'shipment', 'shipment', 'time-30d']) {
      await ok('POST', 'demo/advance', undefined, { what });
    }
    const evidence = await ok('GET', `trades/${id}/evidence`, EXPORTER);
    expect(evidence.checks.find((c: any) => c.checkId === 14).result).toBe('pass');
    expect(evidence.checks.find((c: any) => c.checkId === 14).versions).toBe(2);
    expect(evidence.checks.find((c: any) => c.checkId === 7).result).toBe('pass');
    expect((await ok('GET', `trades/${id}/offers`, EXPORTER)).offers).toHaveLength(3);
    await ok('POST', 'demo/reset');
    await ok('POST', 'demo/reset');
    expect(db().trades.every((t) => t.history)).toBe(true);
  });
});
