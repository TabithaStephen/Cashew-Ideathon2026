import { describe, expect, it } from 'vitest';
import { transition, TransitionError } from '@/lib/engines/state';
import { buildSeed } from '@/lib/seed';
import { reset, getState } from '@/lib/store';
import { canSee, createTrade, grantConsent, revokeConsent } from '@/lib/service';
import type { Trade } from '@/lib/types';

const mk = (status: Trade['status']): Trade => ({ id: 'T1', smeId: 'org_kaveri', buyerId: 'buyer_northgate', corridor: 'IN-GB', hsCode: '610910', goods: '', invoiceNo: '', value: 1, currency: 'USD', fx: 85, incoterm: 'FOB', paymentTermsDays: 90, status, scenario: 'B', flaggedUnknownOrFailed: [], createdAt: '', updatedAt: '' });

describe('state machine (11.7)', () => {
  it('allows legal transitions and writes an audit event', () => {
    const events: string[] = [];
    const t = mk('DRAFT');
    transition(t, 'SUBMITTED', 'x', { audit: (_a, act) => events.push(act) });
    expect(t.status).toBe('SUBMITTED'); expect(events).toEqual(['trade.status_changed']);
  });
  it('throws on illegal transitions', () => {
    expect(() => transition(mk('DRAFT'), 'FINANCED', 'x', { audit: () => {} })).toThrow(TransitionError);
    expect(() => transition(mk('REPAID'), 'OFFERS_OPEN', 'x', { audit: () => {} })).toThrow(/Cannot move/);
  });
  it('blocks OFFERS_OPEN unless minimum checks pass or are flagged', () => {
    const t = mk('VERIFIED');
    const res = { 1: 'pass', 2: 'pass', 5: 'pass', 8: 'fail', 12: 'pass', 14: 'pending' } as const;
    expect(() => transition(t, 'OFFERS_OPEN', 'x', { audit: () => {}, checkResults: res })).toThrow(/8, 14/);
    t.flaggedUnknownOrFailed = [8, 14];
    transition(t, 'OFFERS_OPEN', 'x', { audit: () => {}, checkResults: res });
    expect(t.status).toBe('OFFERS_OPEN');
  });
});

describe('store and consent-gated visibility', () => {
  it('reset restores seed in under 1 second', () => {
    const t0 = performance.now();
    reset('B');
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(getState().trades.every((t) => t.historical)).toBe(true);
    expect(buildSeed('A').registry.length).toBe(13);
  });
  it('lenders see a trade only with an active, unrevoked consent', () => {
    const s = reset('B');
    const exp = { role: 'exporter' as const, orgId: 'org_kaveri' };
    const t = createTrade(s, exp, { sample: 'B' });
    const banyan = { role: 'lender' as const, orgId: 'lender_banyan' };
    expect(canSee(s, banyan, t)).toBe(false);
    const c = grantConsent(s, exp, { scope: `trade:${t.id}`, recipientOrgId: 'lender_banyan', purpose: 'test' });
    expect(canSee(s, banyan, t)).toBe(true);
    expect(canSee(s, { role: 'lender', orgId: 'lender_tidewater' }, t)).toBe(false);
    revokeConsent(s, exp, c.id);
    expect(canSee(s, banyan, t)).toBe(false);
    expect(canSee(s, { role: 'exporter', orgId: 'org_cks' }, t)).toBe(false);
    expect(s.audit.some((e) => e.action === 'consent.revoked')).toBe(true);
  });
});
