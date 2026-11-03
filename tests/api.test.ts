import { beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { reset } from '@/lib/store';
import * as trades from '@/app/api/trades/route';
import * as docsRoute from '@/app/api/trades/[id]/documents/route';
import * as verify from '@/app/api/trades/[id]/verify/route';
import * as evidence from '@/app/api/trades/[id]/evidence/route';
import * as tradeRoute from '@/app/api/trades/[id]/route';
import * as offerReq from '@/app/api/trades/[id]/offer-requests/route';
import * as offers from '@/app/api/trades/[id]/offers/route';
import * as accept from '@/app/api/offers/[id]/accept/route';
import * as sign from '@/app/api/offers/[id]/sign/route';
import * as regCheck from '@/app/api/registry/check/route';
import * as regEntries from '@/app/api/registry/entries/route';
import * as verifyChain from '@/app/api/registry/verify-chain/route';
import * as speed from '@/app/api/demo/speed/route';
import * as advance from '@/app/api/demo/advance/route';
import * as scenario from '@/app/api/demo/scenario/route';
import * as risk from '@/app/api/trades/[id]/risk-profile/route';
import * as audit from '@/app/api/audit/route';

const EXP = 'exporter:org_kaveri', BANYAN = 'lender:lender_banyan', TIDE = 'lender:lender_tidewater', MER = 'lender:lender_meridian', OPS = 'ops:org_cashew';
function req(path: string, opts: { method?: string; as?: string; json?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers.cookie = `cashew_session=${encodeURIComponent(opts.as)}`;
  if (opts.json !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(new URL(path, 'http://localhost'), { method: opts.method ?? 'GET', headers, body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined) });
}
const j = async (r: Response) => ({ status: r.status, data: await r.json() });
const upload = (id: string, type: string, amended = false) => {
  const f = new FormData();
  f.set('file', new File([new TextEncoder().encode(`fake ${type}`)], `${type}.pdf`, { type: 'application/pdf' }));
  f.set('type', type);
  if (amended) f.set('amended', 'true');
  return docsRoute.POST(req(`/api/trades/${id}/documents`, { method: 'POST', as: EXP, form: f }));
};

describe('Scenario B, API-only walk', () => {
  let id = '';
  beforeAll(async () => { reset('B'); await speed.POST(req('/api/demo/speed', { method: 'POST', json: { factor: 0 } })); });

  it('creates a trade and uploads five documents', async () => {
    const r = await j(await trades.POST(req('/api/trades', { method: 'POST', as: EXP, json: { sample: 'B' } })));
    expect(r.status).toBe(200); id = r.data.id;
    for (const t of ['po', 'invoice', 'packing', 'shippingBill', 'bl']) expect((await upload(id, t)).status).toBe(200);
  });

  it('runs verification: check 8 fails with the exact line', async () => {
    expect((await verify.POST(req(`/api/trades/${id}/verify`, { method: 'POST', as: EXP, json: {} }))).status).toBe(200);
    const ev = (await j(await evidence.GET(req(`/api/trades/${id}/evidence`, { as: EXP })))).data;
    const c8 = ev.checks.find((c: { checkId: number }) => c.checkId === 8);
    expect(c8.record.result).toBe('fail');
    expect(c8.record.line).toBe('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.');
    expect(ev.status).toBe('NEEDS_INFO');
    expect(ev.counts).toMatchObject({ pass: 11, fail: 1, unknown: 1, pending: 1 });
    const rp = (await j(await risk.GET(req(`/api/trades/${id}/risk-profile?w=1,1,1,1`, { as: EXP })))).data;
    expect(rp.strength).toBe(82.8); expect(rp.band).toBe('Limited');
  });

  it('opening to lenders is refused while check 8 fails', async () => {
    const r = await offerReq.POST(req(`/api/trades/${id}/offer-requests`, { method: 'POST', as: EXP }));
    expect(r.status).toBe(409);
  });

  it('amended invoice fixes check 8', async () => {
    expect((await upload(id, 'invoice', true)).status).toBe(200);
    await verify.POST(req(`/api/trades/${id}/verify`, { method: 'POST', as: EXP, json: { checkId: 8 } }));
    const ev = (await j(await evidence.GET(req(`/api/trades/${id}/evidence`, { as: EXP })))).data;
    expect(ev.checks.find((c: { checkId: number }) => c.checkId === 8).record.result).toBe('pass');
    expect(ev.checks.find((c: { checkId: number }) => c.checkId === 8).history).toBe(2); // appended, not overwritten
    expect(ev.status).toBe('VERIFIED');
  });

  it('lenders cannot see the trade before consent', async () => {
    const r = await j(await tradeRoute.GET(req(`/api/trades/${id}`, { as: BANYAN })));
    expect(r.status).toBe(403); expect(r.data.error.code).toBe('CONSENT_REQUIRED');
    const list = (await j(await trades.GET(req('/api/trades', { as: BANYAN })))).data;
    expect(list.find((t: { id: string }) => t.id === id)).toBeUndefined();
  });

  it('buyer confirms, consent opens to lenders, offers arrive and match 6.5', async () => {
    await advance.POST(req('/api/demo/advance', { method: 'POST', json: { what: 'buyer-confirm', tradeId: id } }));
    const r = await j(await offerReq.POST(req(`/api/trades/${id}/offer-requests`, { method: 'POST', as: EXP })));
    expect(r.status).toBe(200);
    expect(r.data.filter((x: { eligible: boolean }) => x.eligible)).toHaveLength(3);
    const o = (await j(await offers.GET(req(`/api/trades/${id}/offers`, { as: EXP })))).data;
    expect(o.offers.map((x: { lender: string }) => x.lender)).toEqual(['Meridian Bank', 'Banyan Capital', 'Tidewater Finance']);
    expect(o.offers.map((x: { maths: { effectiveAPR: number } }) => (x.maths.effectiveAPR * 100).toFixed(2))).toEqual(['12.93', '13.53', '16.58']);
    const tide = o.offers.find((x: { lender: string }) => x.lender === 'Tidewater Finance');
    expect(Math.round(tide.maths.hiddenFees)).toBe(16065);
    expect(JSON.stringify(o)).not.toMatch(/commission/i);
  });

  it('sealed offers: a lender sees only its own offer', async () => {
    const o = (await j(await offers.GET(req(`/api/trades/${id}/offers`, { as: TIDE })))).data;
    expect(o.sealed).toBe(true);
    expect(o.offers).toHaveLength(1);
    expect(o.offers[0].lender).toBe('Tidewater Finance');
  });

  it('accept, sign, registry commit, financed', async () => {
    const o = (await j(await offers.GET(req(`/api/trades/${id}/offers`, { as: EXP })))).data;
    const meridian = o.offers[0].offer.id;
    expect((await accept.POST(req(`/api/offers/${meridian}/accept`, { method: 'POST', as: EXP }))).status).toBe(200);
    const bad = await sign.POST(req(`/api/offers/${meridian}/sign`, { method: 'POST', as: EXP, json: { otp: '12' } }));
    expect(bad.status).toBe(400);
    const sg = (await j(await sign.POST(req(`/api/offers/${meridian}/sign`, { method: 'POST', as: EXP, json: { otp: '482913' } })))).data;
    expect(sg.committed).toBe(true);
    const ws = (await j(await tradeRoute.GET(req(`/api/trades/${id}`, { as: EXP })))).data;
    expect(ws.trade.status).toBe('FINANCED');
    expect(ws.trade.registryReceipt.position).toBe(14);
    const vc = (await j(await verifyChain.POST(req('/api/registry/verify-chain', { method: 'POST', as: OPS })))).data;
    expect(vc).toMatchObject({ ok: true, count: 14 });
    const after = (await j(await offers.GET(req(`/api/trades/${id}/offers`, { as: TIDE })))).data;
    expect(after.sealed).toBe(false); // window closed after acceptance
  });

  it('every state change is in the audit log', async () => {
    const ev = (await j(await audit.GET(req(`/api/audit?tradeId=${id}`, { as: OPS })))).data as { action: string }[];
    const actions = new Set(ev.map((e) => e.action));
    for (const a of ['trade.created', 'document.uploaded', 'document.extracted', 'verification.started', 'verification.check.completed', 'consent.granted', 'offers.requested', 'offer.submitted', 'ranking.computed', 'offer.accepted', 'contract.signed', 'registry.checked', 'registry.committed', 'trade.status_changed'])
      expect(actions.has(a), a).toBe(true);
  });
});

describe('Scenario C: duplicate detection never leaks lender identity', () => {
  beforeAll(async () => {
    await speed.POST(req('/api/demo/speed', { method: 'POST', json: { factor: 0 } }));
    await scenario.POST(req('/api/demo/scenario', { method: 'POST', json: { id: 'C' } }));
  });
  it('attempt 1 fails check 12 (financed by other), attempt 2 flags ~0.87', async () => {
    const a1 = (await j(await advance.POST(req('/api/demo/advance', { method: 'POST', json: { what: 'duplicate-1' } })))).data;
    const a2 = (await j(await advance.POST(req('/api/demo/advance', { method: 'POST', json: { what: 'duplicate-2' } })))).data;
    const ev1 = (await j(await evidence.GET(req(`/api/trades/${a1.tradeId}/evidence`, { as: OPS })))).data;
    const c12 = ev1.checks.find((c: { checkId: number }) => c.checkId === 12).record;
    expect(c12.result).toBe('fail');
    expect(c12.line).toBe('This invoice has already been financed through Cashew. Details are not shared.');
    expect(JSON.stringify(c12)).not.toMatch(/banyan|lender_/i);
    const ev2 = (await j(await evidence.GET(req(`/api/trades/${a2.tradeId}/evidence`, { as: OPS })))).data;
    const w = ev2.checks.find((c: { checkId: number }) => c.checkId === 12).record;
    expect(w.result).toBe('warn');
    expect(w.evidence.similarity.overall).toBeCloseTo(0.87, 2);
    const rc = (await j(await regCheck.POST(req('/api/registry/check', { method: 'POST', as: OPS, json: { tradeId: a1.tradeId } })))).data;
    expect(rc.result).toBe('FINANCED_BY_OTHER');
    expect(JSON.stringify(rc)).not.toMatch(/banyan|lender_/i);
    const reg = (await j(await regEntries.GET(req('/api/registry/entries', { as: MER })))).data;
    expect(JSON.stringify(reg)).not.toMatch(/banyan|tidewater|lender_/i);
    expect(reg.count).toBe(14); // carried-over Scenario B commit
  });
});
