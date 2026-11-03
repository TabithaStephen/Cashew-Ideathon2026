// Seed builder: rebuilds the whole demo state from lib/seed in well under a second.
import type { DemoState, ScenarioId, Trade } from '../types';
import { appendEntry } from '../engines/registry';
import { BUYERS, ORGS } from './orgs';
import { PRODUCTS } from './lenders';
import { DAY, HISTORY, OTHER_REGISTRY, demoToday, relDate } from './scenarios';
import { FX_USD_INR } from '../format';

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function buildSeed(scenario: ScenarioId, now = Date.now()): DemoState {
  const today = demoToday(now).getTime();
  const at = (daysAgo: number) => new Date(today - daysAgo * DAY).toISOString();
  const s: DemoState = {
    version: 3, scenario, speed: 1, clockOffsetMs: 0,
    orgs: clone(ORGS), buyers: clone(BUYERS), products: clone(PRODUCTS),
    trades: [], docs: [], checks: [], runs: [], riskProfiles: [], offerRequests: [], offers: [],
    registry: [], registryIndex: [], consents: [], audit: [], opsQueue: [], notifications: [], webhooks: [],
    seq: 0, epoch: now, lastAnchoredAt: at(1),
  };

  // Historical trades (Passport history and Scenario C's already-financed invoice).
  for (const h of HISTORY) {
    const t: Trade = {
      id: h.id, smeId: h.smeId, buyerId: h.buyerId, corridor: 'IN-GB', hsCode: '610910', goods: 'Cotton knit T-shirts',
      invoiceNo: h.invoiceNo, value: h.usd, currency: 'USD', fx: FX_USD_INR, incoterm: 'FOB', paymentTermsDays: 90,
      status: h.settled ? 'CLOSED' : 'FINANCED', scenario, flaggedUnknownOrFailed: [], createdAt: at(h.daysAgo + 2), updatedAt: at(h.settled ? h.daysAgo - 95 : h.daysAgo - 3),
      historical: true, buyerConfirmed: true, shipmentStage: h.settled ? 4 : 2, advanceInr: Math.round(h.usd * FX_USD_INR * 0.85),
      disbursedAt: at(h.daysAgo - 3), repaidAt: h.settled ? at(h.daysAgo - 95) : undefined,
    };
    s.trades.push(t);
  }

  // Registry: replay financed/settled events in chronological order to build the hash chain.
  type Ev = { t: number; kind: 'FIN' | 'SET'; key: string; identity: Parameters<typeof appendEntry>[2]['identity']; lenderId: string };
  const events: Ev[] = [];
  for (const h of HISTORY) {
    const org = ORGS.find((o) => o.id === h.smeId)!;
    const buyer = BUYERS.find((b) => b.id === h.buyerId)!;
    const identity = { supplierId: org.gstin!, buyerId: buyer.registrationId, invoiceNo: h.invoiceNo, invoiceDate: relDate(-h.daysAgo, now), amount: h.usd, currency: 'USD', irn: h.irn };
    events.push({ t: today - (h.daysAgo - 3) * DAY, kind: 'FIN', key: h.invoiceNo, identity, lenderId: h.lenderId });
    if (h.settled) events.push({ t: today - (h.daysAgo - 95) * DAY, kind: 'SET', key: h.invoiceNo, identity, lenderId: h.lenderId });
  }
  for (const o of OTHER_REGISTRY) {
    const identity = { supplierId: o.supplier, buyerId: o.buyer, invoiceNo: o.invoiceNo, invoiceDate: relDate(-o.daysAgo, now), amount: o.usd, currency: 'USD' };
    events.push({ t: today - (o.daysAgo - 3) * DAY, kind: 'FIN', key: o.invoiceNo, identity, lenderId: o.lenderId });
  }
  events.sort((a, b) => a.t - b.t);
  const posByKey: Record<string, number> = {};
  for (const e of events) {
    const ts = new Date(e.t).toISOString();
    if (e.kind === 'FIN') posByKey[e.key] = appendEntry(s.registry, s.registryIndex, { identity: e.identity, lenderId: e.lenderId, status: 'FINANCED', timestamp: ts }).position;
    else {
      const ref = s.registry[posByKey[e.key] - 1];
      appendEntry(s.registry, s.registryIndex, { fingerprint: ref.fingerprint, irnFp: ref.irnFingerprint, lenderId: e.lenderId, status: 'SETTLED', timestamp: ts, refPosition: ref.position });
    }
  }

  s.audit.push({ id: 'evt_seed', actor: 'system', action: 'demo.reset', object: `scenario:${scenario}`, timestamp: new Date(now).toISOString(), meta: { registryEntries: s.registry.length } });
  return s;
}
