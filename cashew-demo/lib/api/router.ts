// The mock API (Blueprint Section 12). One dispatcher behind one catch-all route handler, so the paths match
// the spec and tests can call it directly. Role and consent rules (13.4) are enforced here, not in the UI.
import { createHash } from 'node:crypto';
import { IllegalTransition, hasActiveConsent } from '@/lib/engines/state';
import type { SortKey } from '@/lib/engines/matching';
import { LENDER_ORGS } from '@/lib/seed/lenders';
import { OPS_USER } from '@/lib/seed/orgs';
import * as svc from '@/lib/services';
import { ApiError } from '@/lib/services';
import { db, save } from '@/lib/store';
import type { DemoState, DocType, OpsDecision, ScenarioId, Session, Trade } from '@/lib/types';

const COOKIE = 'cashew_session';

function readSession(req: Request): Session | undefined {
  const raw = req.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return undefined;
  const [role, lenderId] = decodeURIComponent(raw).split(':');
  if (role === 'exporter' || role === 'ops') return { role };
  if (role === 'lender' && LENDER_ORGS.some((l) => l.id === lenderId)) return { role, lenderId };
  return undefined;
}

const need = (session: Session | undefined): Session => {
  if (!session) throw new ApiError('NO_SESSION', 'Pick a role first.', 401);
  return session;
};
const needRole = (session: Session | undefined, ...roles: Session['role'][]): Session => {
  const s = need(session);
  if (!roles.includes(s.role)) throw new ApiError('FORBIDDEN', 'Your role cannot do this.', 403);
  return s;
};
const needLender = (session: Session | undefined): string => needRole(session, 'lender').lenderId!;

const actorName = (s: DemoState, session: Session | undefined) =>
  session?.role === 'ops' ? OPS_USER : session?.role === 'lender' ? svc.orgName(s, session.lenderId!) : svc.orgName(s, svc.exporterId(s));

/** Enforces 13.4: exporters see their own trades, lenders need an active consent, Ops sees everything. */
function visibleTrade(s: DemoState, session: Session, id: string): Trade {
  const trade = svc.findTrade(s, id);
  if (session.role === 'exporter' && trade.smeId !== svc.exporterId(s)) throw new ApiError('NOT_FOUND', 'This trade does not exist.', 404);
  if (session.role === 'lender' && !hasActiveConsent(s.consents, session.lenderId!, id, svc.nowIso(s))) {
    throw new ApiError('CONSENT_REQUIRED', 'This trade has not been shared with you.', 403);
  }
  return trade;
}
const ownTrade = (s: DemoState, session: Session | undefined, id: string) => {
  const me = needRole(session, 'exporter');
  return visibleTrade(s, me, id);
};

function lenderTradeRow(s: DemoState, trade: Trade, lenderId: string) {
  const own = s.offers.find((o) => o.tradeId === trade.id && o.lenderId === lenderId);
  const declined = s.declines.some((d) => d.tradeId === trade.id && d.lenderId === lenderId);
  const acceptedOffer = s.offers.find((o) => o.id === trade.acceptedOfferId);
  const won = acceptedOffer?.lenderId === lenderId;
  const view = svc.tradeView(s, trade);
  return {
    ...view,
    acceptedOffer: won ? view.acceptedOffer : undefined, // Another lender's terms stay sealed.
    openCases: [],
    requestedAt: s.consents.find((c) => c.recipientOrgId === lenderId && c.scope === `trade:${trade.id}`)?.grantedAt,
    offerStatus: won ? 'Accepted' : own ? 'Offer sent' : declined ? 'Declined' : 'Not responded',
    tab: won ? 'Financed' : own ? 'Offered' : 'New',
    ownOfferId: own?.id,
  };
}

async function jsonBody(req: Request): Promise<Record<string, any>> {
  try {
    return (await req.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

type Handler = (ctx: { req: Request; session?: Session; params: string[]; url: URL; s: DemoState }) => unknown | Promise<unknown>;
const routes: Array<[string, string, Handler]> = [];
const on = (method: string, pattern: string, handler: Handler) => routes.push([method, pattern, handler]);

// ---- Session and orgs
on('POST', 'session', async ({ req, s }) => {
  const body = await jsonBody(req);
  const value = body.role === 'lender' ? `lender:${body.lenderId ?? LENDER_ORGS[0].id}` : body.role;
  const session = value && readSession(new Request('http://x', { headers: { cookie: `${COOKIE}=${value}` } }));
  if (!session) throw new ApiError('BAD_ROLE', 'Choose Exporter, Lender or Ops.');
  svc.audit(s, 'Demo', 'session.started', session.role, { lenderId: session.lenderId });
  save();
  return new Response(JSON.stringify({ session }), { headers: { 'content-type': 'application/json', 'set-cookie': `${COOKIE}=${encodeURIComponent(value)}; Path=/; SameSite=Lax` } });
});
on('GET', 'orgs/me', ({ session, s }) => {
  const me = need(session);
  const orgId = me.role === 'exporter' ? svc.exporterId(s) : me.lenderId;
  const org = s.orgs.find((o) => o.id === orgId);
  return { role: me.role, lenderId: me.lenderId, org: org && { ...org, tier: me.role === 'exporter' ? svc.passportTier(org.id, s) : undefined }, displayName: me.role === 'ops' ? OPS_USER : org?.legalName, lenders: LENDER_ORGS, scenario: s.scenario };
});
on('GET', 'buyers', ({ session, s }) => {
  need(session);
  return { buyers: s.buyers };
});

// ---- Trades
on('POST', 'trades', async ({ req, session, s }) => {
  needRole(session, 'exporter');
  return svc.tradeView(s, svc.createTrade((await jsonBody(req)) as unknown as svc.NewTrade, actorName(s, session)));
});
on('GET', 'trades', ({ session, s }) => {
  const me = need(session);
  const newestFirst = [...s.trades].reverse();
  if (me.role === 'exporter') return { trades: newestFirst.filter((t) => t.smeId === svc.exporterId(s)).map((t) => svc.tradeView(s, t)) };
  if (me.role === 'lender') return { trades: newestFirst.filter((t) => hasActiveConsent(s.consents, me.lenderId!, t.id, svc.nowIso(s))).map((t) => lenderTradeRow(s, t, me.lenderId!)) };
  return { trades: newestFirst.map((t) => svc.tradeView(s, t)) };
});
on('GET', 'trades/:id', ({ session, params, s }) => {
  const me = need(session);
  const trade = visibleTrade(s, me, params[0]);
  return me.role === 'lender' ? lenderTradeRow(s, trade, me.lenderId!) : svc.tradeView(s, trade);
});
on('POST', 'trades/:id/documents', async ({ req, session, params, s }) => {
  ownTrade(s, session, params[0]);
  const type = req.headers.get('content-type') ?? '';
  let slot: unknown;
  let file: { name: string; sha256: string } | undefined;
  if (type.includes('multipart/form-data')) {
    const form = await req.formData();
    slot = form.get('slot');
    const upload = form.get('file');
    if (upload instanceof File) file = { name: upload.name, sha256: createHash('sha256').update(Buffer.from(await upload.arrayBuffer())).digest('hex') };
  } else {
    slot = (await jsonBody(req)).slot;
  }
  return svc.attachDocument(params[0], slot as DocType, actorName(s, session), file);
});
on('POST', 'trades/:id/verify', async ({ req, session, params, s }) => {
  ownTrade(s, session, params[0]);
  svc.startVerification(params[0], actorName(s, session), (await jsonBody(req)).checkId);
  return svc.evidenceBundle(params[0]);
});
on('GET', 'trades/:id/evidence', ({ session, params, s }) => {
  visibleTrade(s, need(session), params[0]);
  return svc.evidenceBundle(params[0]);
});
on('GET', 'trades/:id/risk-profile', ({ session, params, url, s }) => {
  const trade = visibleTrade(s, need(session), params[0]);
  const weights = url.searchParams.get('w')?.split(',').map(Number);
  if (weights && (weights.length !== 4 || weights.some((w) => !(w >= 0 && w <= 2)))) throw new ApiError('BAD_WEIGHTS', 'Weights are four numbers from 0 to 2.');
  return svc.riskFor(s, trade, weights);
});
on('POST', 'trades/:id/flag', ({ session, params, s }) => {
  ownTrade(s, session, params[0]);
  svc.flagAndContinue(params[0], actorName(s, session));
  return svc.tradeView(s, svc.findTrade(s, params[0]));
});
on('POST', 'trades/:id/ops-review', ({ session, params, s }) => {
  ownTrade(s, session, params[0]);
  svc.sendToOpsReview(params[0], actorName(s, session));
  return { ok: true };
});
on('POST', 'trades/:id/milestones', ({ session, params, s }) => {
  ownTrade(s, session, params[0]);
  return svc.tradeView(s, svc.confirmDelivered(params[0], actorName(s, session)));
});
on('POST', 'trades/:id/offer-requests', ({ session, params, s }) => {
  ownTrade(s, session, params[0]);
  return { eligibility: svc.requestOffers(params[0], actorName(s, session)) };
});
on('POST', 'trades/:id/decline', ({ session, params, s }) => {
  const lenderId = needLender(session);
  visibleTrade(s, session!, params[0]);
  svc.declineOffer(params[0], lenderId);
  return { ok: true };
});
on('GET', 'trades/:id/offers', ({ session, params, url, s }) => {
  const me = need(session);
  const trade = visibleTrade(s, me, params[0]);
  if (me.role === 'lender') {
    // Sealed: a lender only ever gets its own offer back.
    const own = s.offers.filter((o) => o.tradeId === trade.id && o.lenderId === me.lenderId).map((o) => svc.offerView(s, o, trade));
    return { offers: own, waiting: [], declined: [], badges: {} };
  }
  const sort = (['cost', 'fastest', 'cash'].includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort') : 'cost') as SortKey;
  return svc.offersForExporter(params[0], sort, actorName(s, session));
});
on('GET', 'trades/:id/audit', ({ session, params, s }) => {
  const trade = visibleTrade(s, needRole(session, 'exporter', 'ops'), params[0]);
  return { events: s.audit.filter((e) => e.object === trade.id).reverse(), consents: s.consents.filter((c) => c.scope === `trade:${trade.id}`).map((c) => ({ ...c, recipient: svc.orgName(s, c.recipientOrgId) })) };
});

// ---- Consents and offers
on('POST', 'consents', async ({ req, session, s }) => {
  const body = await jsonBody(req);
  ownTrade(s, session, body.tradeId);
  return { consents: svc.grantConsent(body.tradeId, body.flagged ?? [], actorName(s, session)) };
});
on('DELETE', 'consents/:id', ({ session, params, s }) => {
  needRole(session, 'exporter');
  return svc.revokeConsent(params[0], svc.exporterId(s), actorName(s, session));
});
on('POST', 'offers', async ({ req, session, s }) => {
  const lenderId = needLender(session);
  const body = await jsonBody(req);
  visibleTrade(s, session!, body.tradeId);
  return svc.submitOffer(body.tradeId, lenderId, body as unknown as svc.OfferInput);
});
const offerOwner = (s: DemoState, session: Session | undefined, id: string) => {
  const offer = s.offers.find((o) => o.id === id);
  if (!offer) throw new ApiError('NOT_FOUND', 'This offer does not exist.', 404);
  ownTrade(s, session, offer.tradeId);
};
on('POST', 'offers/:id/accept', ({ session, params, s }) => {
  offerOwner(s, session, params[0]);
  return svc.acceptOffer(params[0], actorName(s, session));
});
on('POST', 'offers/:id/sign', async ({ req, session, params, s }) => {
  offerOwner(s, session, params[0]);
  return svc.tradeView(s, svc.signOffer(params[0], String((await jsonBody(req)).otp ?? ''), actorName(s, session)));
});

// ---- Registry: result codes only, and never another lender's identity
on('POST', 'registry/check', async ({ req, session, s }) => {
  const me = needRole(session, 'lender', 'ops');
  const body = await jsonBody(req);
  if (body.tradeId) visibleTrade(s, me, body.tradeId);
  return svc.registryLookup(body.tradeId, body.sample, me.lenderId);
});
on('POST', 'registry/commit', async ({ req, session, s }) => {
  const lenderId = needLender(session);
  const body = await jsonBody(req);
  visibleTrade(s, session!, body.tradeId);
  return svc.lenderCommit(body.tradeId, lenderId);
});
on('GET', 'registry/entries', ({ session }) => {
  needRole(session, 'lender', 'ops');
  return svc.registryView();
});
on('POST', 'registry/verify-chain', ({ session }) => {
  needRole(session, 'lender', 'ops');
  return svc.verifyRegistryChain();
});
on('POST', 'registry/anchor', ({ session }) => {
  needRole(session, 'lender', 'ops');
  return svc.anchorRegistry();
});

// ---- Passport
on('GET', 'passport/:orgId', ({ session, params, s }) => {
  const me = need(session);
  if (me.role === 'exporter' && params[0] !== svc.exporterId(s)) throw new ApiError('FORBIDDEN', 'This Passport belongs to another exporter.', 403);
  if (me.role === 'lender' && !s.consents.some((c) => c.orgId === params[0] && c.scope === 'passport' && c.recipientOrgId === me.lenderId && !c.revokedAt && c.expiresAt > svc.nowIso(s))) {
    throw new ApiError('CONSENT_REQUIRED', 'This Passport has not been shared with you.', 403);
  }
  return svc.passportFor(params[0]);
});
on('POST', 'passport/share', async ({ req, session, s }) => {
  needRole(session, 'exporter');
  const body = await jsonBody(req);
  return svc.sharePassport(svc.exporterId(s), body.recipientOrgId, body.purpose, actorName(s, session));
});

// ---- Audit, Ops, notifications
on('GET', 'audit', ({ session, url, s }) => {
  needRole(session, 'ops');
  const tradeId = url.searchParams.get('tradeId');
  return { events: s.audit.filter((e) => !tradeId || e.object === tradeId).reverse() };
});
on('GET', 'ops/queue', ({ session, s }) => {
  needRole(session, 'ops');
  return { cases: [...s.queue].reverse().map((c) => ({ ...c, trade: svc.tradeView(s, svc.findTrade(s, c.tradeId)) })) };
});
on('POST', 'ops/queue/:id/decision', async ({ req, session, params }) => {
  needRole(session, 'ops');
  const body = await jsonBody(req);
  return svc.opsDecision(params[0], body.decision as OpsDecision, body.note);
});
on('GET', 'ops/events', ({ session, s }) => {
  needRole(session, 'ops');
  return { events: [...s.events].reverse() };
});
on('GET', 'ops/matching', ({ session, s }) => {
  needRole(session, 'ops');
  return { trades: s.trades.filter((t) => t.eligibility).reverse().map((t) => ({ id: t.id, eligibility: t.eligibility })) };
});
on('GET', 'notifications', ({ session, url, s }) => {
  const me = need(session);
  const audience = me.role === 'ops' ? 'ops' : me.role === 'lender' ? me.lenderId : svc.exporterId(s);
  const after = Number(url.searchParams.get('after') ?? 0);
  return { notifications: s.notifications.filter((n) => n.audience === audience && n.id > after), latest: s.notifications.length };
});

// ---- Lender products
on('GET', 'lender/products', ({ session, s }) => {
  const lenderId = needLender(session);
  return { products: s.products.filter((p) => p.lenderId === lenderId) };
});
on('PATCH', 'lender/products/:id', async ({ req, session, params }) => svc.updateProduct(params[0], needLender(session), await jsonBody(req)));

// ---- Demo
on('GET', 'demo/state', ({ s }) => ({ scenario: s.scenario, speed: s.speed, stagedLabels: s.stagedLabels, resetCount: s.resetCount, clockOffsetDays: s.clockOffsetDays, activeTradeId: svc.activeTrade(s)?.id }));
on('POST', 'demo/scenario', async ({ req }) => {
  const id = (await jsonBody(req)).id as ScenarioId;
  if (!['A', 'B', 'C'].includes(id)) throw new ApiError('BAD_SCENARIO', 'Scenario is A, B or C.');
  return { scenario: svc.demoReset(id).scenario };
});
on('POST', 'demo/speed', async ({ req, s }) => {
  const factor = (await jsonBody(req)).factor;
  if (![0, 0.5, 1, 2].includes(factor)) throw new ApiError('BAD_SPEED', 'Speed is 0.5, 1, 2 or 0 for Instant.');
  s.speed = factor;
  save();
  return { speed: s.speed };
});
on('POST', 'demo/settings', async ({ req, s }) => {
  const body = await jsonBody(req);
  if (typeof body.stagedLabels === 'boolean') s.stagedLabels = body.stagedLabels;
  save();
  return { stagedLabels: s.stagedLabels };
});
on('POST', 'demo/advance', async ({ req }) => svc.demoAdvance((await jsonBody(req)).what));
on('POST', 'demo/reset', () => ({ scenario: svc.demoReset().scenario }));

function match(method: string, path: string[]) {
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const parts = pattern.split('/');
    if (parts.length !== path.length) continue;
    const params: string[] = [];
    if (parts.every((part, i) => (part.startsWith(':') ? (params.push(decodeURIComponent(path[i])), true) : part === path[i]))) return { handler, params };
  }
  return undefined;
}

const errorResponse = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

export async function dispatch(req: Request, path: string[]): Promise<Response> {
  const found = match(req.method, path);
  if (!found) return errorResponse('NOT_FOUND', 'No such API route.', 404);
  try {
    svc.tick();
    const result = await found.handler({ req, session: readSession(req), params: found.params, url: new URL(req.url), s: db() });
    return result instanceof Response ? result : Response.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error.code, error.message, error.status);
    if (error instanceof IllegalTransition) return errorResponse(error.code, error.message, 409);
    console.error(error);
    return errorResponse('SERVER_ERROR', 'Something failed on the server. Your documents are safe. Try again.', 500);
  }
}
