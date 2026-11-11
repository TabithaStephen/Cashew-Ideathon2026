// Everything that changes demo state. Route handlers call these; nothing else writes to the store.
// Timed events are due-times checked by tick(), so there are no background workers and a refresh loses nothing.
import { canonicalJSON } from '@/lib/canonical';
import { checkDef, CHECKS, type TradeContext } from '@/lib/engines/verification';
import { allFees, decideEligibility, normaliseStoredOffer, rankOffers, type SortKey } from '@/lib/engines/matching';
import { claimsFrom, issuePassport, tierFor } from '@/lib/engines/passport';
import { appendEntry, checkRegistry, irnFingerprint, matchRow, sha256, verifyChain, type InvoiceIdentity, type RegistryCheck } from '@/lib/engines/registry';
import { computeRisk } from '@/lib/engines/risk';
import { hasActiveConsent, latestChecks, transition as moveTrade, unmetMinimumChecks } from '@/lib/engines/state';
import { LENDER_ORGS } from '@/lib/seed/lenders';
import { CKS, KAVERI, OPS_USER } from '@/lib/seed/orgs';
import { AMENDED_PDF, amendedInvoice, DOC_TYPES, extractedFor, pdfFor, SAMPLE_TRADES, sourcesFor } from '@/lib/seed/scenarios';
import { passportKeys, passportPublicKeyB64, REGISTRY_SALT, registryKeys } from '@/lib/server/config';
import { db, reset, save } from '@/lib/store';
import type { CheckResult, DemoNotification, DemoState, Doc, DocSetId, DocType, Fee, LenderProduct, Offer, OpsDecision, QueueReason, ScenarioId, Trade, TradeStatus, VerificationCheck, WebhookEvent } from '@/lib/types';
import type { DocFields } from '@/lib/engines/crossdoc';

const DAY = 86_400_000;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export const nowIso = (s: DemoState = db()) => new Date(Date.now() + s.clockOffsetDays * DAY).toISOString();
const nextId = (s: DemoState, prefix: string) => `${prefix}_${++s.seq}`;
/** Scales a 1x duration by the speed setting. "Instant" is a speed of 0. */
const scaled = (s: DemoState, ms: number) => (s.speed === 0 ? 0 : ms / s.speed);

export const exporterId = (s: DemoState = db()) => (s.scenario === 'C' ? CKS : KAVERI);
export const orgName = (s: DemoState, id: string) => s.orgs.find((o) => o.id === id)?.legalName ?? id;
const buyerName = (s: DemoState, id: string) => s.buyers.find((b) => b.id === id)?.name ?? id;
export const inrValue = (t: Pick<Trade, 'value' | 'fx'>) => t.value * t.fx;

export function audit(s: DemoState, actor: string, action: string, object: string, meta?: unknown) {
  s.audit.push({ id: nextId(s, 'evt'), actor, action, object, timestamp: nowIso(s), meta });
}
function notify(s: DemoState, audience: string, message: string, tone: DemoNotification['tone'] = 'info', kind: DemoNotification['kind'] = 'toast') {
  s.notifications.push({ id: s.notifications.length + 1, audience, kind, tone, message, at: nowIso(s) });
}
function emit(s: DemoState, type: WebhookEvent['type'], object: string) {
  s.events.push({ id: nextId(s, 'hook'), type, object, at: nowIso(s) });
}
function move(s: DemoState, trade: Trade, to: TradeStatus, actor: string) {
  moveTrade(trade, to, actor, { checks: s.checks, now: nowIso(s), audit: (a, b, c, d) => audit(s, a, b, c, d) });
}

export function findTrade(s: DemoState, id: string): Trade {
  const trade = s.trades.find((t) => t.id === id);
  if (!trade) throw new ApiError('NOT_FOUND', 'This trade does not exist in the current scenario.', 404);
  return trade;
}

const docsOf = (s: DemoState, tradeId: string) => {
  const latest = new Map<DocType, Doc>();
  for (const doc of s.docs) if (doc.tradeId === tradeId) latest.set(doc.type, doc);
  return latest;
};
const docFields = (s: DemoState, tradeId: string): DocFields => Object.fromEntries(Array.from(docsOf(s, tradeId), ([type, doc]) => [type, doc.extracted]));

function invoiceIdentity(s: DemoState, trade: Trade): InvoiceIdentity {
  const invoice = docsOf(s, trade.id).get('invoice')?.extracted;
  if (!invoice) throw new ApiError('NO_INVOICE', 'Upload the invoice first.', 409);
  return {
    supplierId: trade.smeId,
    buyerId: trade.buyerId,
    invoiceNo: String(invoice.invoiceNo.value),
    amount: Number(invoice.amount.value),
    date: String(invoice.invoiceDate.value),
    currency: invoice.amount.currency ?? trade.currency,
    irn: invoice.irn ? String(invoice.irn.value) : undefined,
  };
}

// ---- Trades and documents ------------------------------------------------------------------

export interface NewTrade {
  buyerId: string;
  goods: string;
  hsCode: string;
  value: number;
  currency?: string;
  incoterm: string;
  paymentTermsDays: number;
  docSet?: DocSetId;
}

export function createTrade(input: NewTrade, actor: string): Trade {
  const s = db();
  const buyer = s.buyers.find((b) => b.id === input.buyerId);
  if (!buyer) throw new ApiError('BAD_BUYER', 'Choose a buyer from the list.');
  if (!(input.value > 0)) throw new ApiError('BAD_VALUE', 'Enter a trade value above zero.');
  if (!(input.paymentTermsDays > 0)) throw new ApiError('BAD_TERMS', 'Enter payment terms in days.');
  const docSet: DocSetId = input.docSet ?? (s.scenario === 'A' ? 'A' : s.scenario === 'C' ? 'C1' : 'B');
  const when = nowIso(s);
  const trade: Trade = {
    id: `CSH-2627-${String(++s.seq).padStart(5, '0')}`,
    smeId: exporterId(s), buyerId: buyer.id, corridor: `IN-${buyer.country}`, buyerCountry: buyer.country, sector: 'Textiles',
    goods: input.goods, hsCode: input.hsCode, value: input.value, currency: input.currency ?? 'USD', fx: 85, incoterm: input.incoterm,
    paymentTermsDays: input.paymentTermsDays, status: 'DRAFT', scenario: SAMPLE_TRADES[docSet].scenario, docSet, flaggedUnknownOrFailed: [],
    createdAt: when, updatedAt: when, buyerConfirmed: false, shipmentStage: 0, shipmentLog: [], attempt: SAMPLE_TRADES[docSet].attempt,
  };
  s.trades.push(trade);
  audit(s, actor, 'trade.created', trade.id, { docSet });
  save();
  return trade;
}

function openCase(s: DemoState, tradeId: string, reason: QueueReason, detail?: unknown) {
  if (s.queue.some((c) => c.tradeId === tradeId && c.reason === reason && c.status !== 'closed')) return;
  s.queue.push({ id: nextId(s, 'case'), tradeId, reason, openedAt: nowIso(s), reviewer: OPS_USER, status: 'open', detail });
  notify(s, 'ops', `New review case: ${reason} on ${tradeId}.`, 'warn');
}

export function attachDocument(tradeId: string, type: DocType, actor: string, file?: { name: string; sha256: string }): Doc {
  const s = db();
  const trade = findTrade(s, tradeId);
  if (!['DRAFT', 'NEEDS_INFO', 'VERIFIED'].includes(trade.status)) throw new ApiError('TRADE_LOCKED', 'Documents can no longer be changed on this trade.', 409);
  if (!DOC_TYPES.includes(type)) throw new ApiError('BAD_DOC', 'Unknown document type.');
  const when = new Date(Date.now());
  const check8 = latestChecks(s.checks, trade.id).get(8);
  // Extraction is staged: the fields come from the seed, whatever the file contains (Blueprint Section 3).
  const amending = trade.docSet === 'B' && type === 'invoice' && check8?.result === 'fail';
  const extracted = amending ? amendedInvoice(when) : extractedFor(trade.docSet, type, when);
  const version = s.docs.filter((d) => d.tradeId === tradeId && d.type === type).length + 1;
  const doc: Doc = {
    id: nextId(s, 'doc'), tradeId, type, extracted, version,
    sha256: file?.sha256 ?? sha256(canonicalJSON(extracted)),
    fileName: file?.name ?? (amending ? 'amended-invoice.pdf' : `${type}.pdf`),
    pdf: amending ? AMENDED_PDF : pdfFor(trade.docSet, type),
    verifiedStatus: 'pending', uploadedAt: nowIso(s),
  };
  s.docs.push(doc);
  audit(s, actor, 'document.uploaded', trade.id, { type, version, sha256: doc.sha256 });
  audit(s, 'Cashew extraction (simulated)', 'document.extracted', trade.id, { type, fields: Object.keys(extracted).length });
  if (type === 'invoice') {
    trade.invoiceNo = String(extracted.invoiceNo.value);
    trade.value = Number(extracted.amount.value);
    trade.updatedAt = nowIso(s);
  }
  const low = Object.entries(extracted).filter(([, field]) => field.confidence < 0.85).map(([name]) => name);
  if (low.length > 0) openCase(s, trade.id, 'Low-confidence extraction', { doc: type, fields: low });
  save();
  return doc;
}

// ---- Verification --------------------------------------------------------------------------

function runContext(s: DemoState, trade: Trade): TradeContext {
  return {
    trade,
    docs: docFields(s, trade.id),
    sources: sourcesFor(trade.smeId),
    registry: () => {
      const result = checkRegistry(s.registry, s.registryIndex, REGISTRY_SALT, invoiceIdentity(s, trade));
      audit(s, 'Cashew registry', 'registry.checked', trade.id, { code: result.code });
      return result;
    },
  };
}

function recordCheck(s: DemoState, trade: Trade, checkId: number, durationMs: number) {
  const def = checkDef(checkId);
  const outcome = def.run(runContext(s, trade));
  const check: VerificationCheck = {
    id: nextId(s, 'chk'), tradeId: trade.id, checkId, result: outcome.result, flag: outcome.flag, line: outcome.line, source: def.source, mode: def.mode,
    evidence: outcome.evidence, evidenceHash: sha256(canonicalJSON(outcome.evidence)), runAt: nowIso(s), durationMs,
  };
  s.checks.push(check); // Appended, never overwritten: re-runs keep the history.
  audit(s, 'Cashew verification', 'verification.check.completed', trade.id, { checkId, result: outcome.result });
  if (outcome.result === 'pass') trade.flaggedUnknownOrFailed = trade.flaggedUnknownOrFailed.filter((id) => id !== checkId);
  if (checkId === 8) {
    for (const doc of docsOf(s, trade.id).values()) doc.verifiedStatus = outcome.result;
  }
  return check;
}

export function startVerification(tradeId: string, actor: string, checkId?: number, pace = 1) {
  const s = db();
  const trade = findTrade(s, tradeId);
  if (s.runs.some((r) => r.tradeId === tradeId && !r.finished)) return; // Pressing Run twice changes nothing.
  if (docsOf(s, tradeId).size < DOC_TYPES.length) throw new ApiError('DOCS_MISSING', 'Add all five documents before running verification.', 409);
  if (checkId !== undefined && !CHECKS.some((c) => c.id === checkId)) throw new ApiError('BAD_CHECK', 'Unknown check.');
  if (trade.status === 'DRAFT') move(s, trade, 'SUBMITTED', actor);
  if (trade.status === 'SUBMITTED' || trade.status === 'NEEDS_INFO' || trade.status === 'VERIFIED') move(s, trade, 'VERIFYING', actor);
  else if (trade.status !== 'VERIFYING') throw new ApiError('ILLEGAL_TRANSITION', `Verification can't run on a trade in ${trade.status}.`, 409);
  audit(s, actor, 'verification.started', tradeId, { checkId: checkId ?? 'all' });
  let at = Date.now();
  const defs = checkId ? [checkDef(checkId)] : CHECKS;
  const plan = defs.map((def) => {
    const startAt = at;
    at += scaled(s, def.durationMs * pace);
    return { checkId: def.id, startAt, dueAt: at, done: false, durationMs: def.durationMs };
  });
  s.runs.push({ id: nextId(s, 'run'), tradeId, plan, finished: false });
  tick();
  save();
}

function settleRun(s: DemoState, trade: Trade) {
  const latest = latestChecks(s.checks, trade.id);
  const registry = latest.get(12);
  if (registry?.result === 'fail') {
    move(s, trade, 'REJECTED_VERIFICATION', 'Cashew registry');
    audit(s, 'Cashew registry', 'duplicate.flagged', trade.id, { code: 'FINANCED_BY_OTHER' });
    emit(s, 'duplicate.flagged', trade.id);
    notify(s, trade.smeId, 'This invoice has already been financed through Cashew. Details are not shared.', 'fail');
    return;
  }
  if (registry?.flag === 'possible-duplicate') {
    move(s, trade, 'NEEDS_INFO', 'Cashew registry');
    audit(s, 'Cashew registry', 'duplicate.flagged', trade.id, { code: 'POSSIBLE_DUPLICATE' });
    emit(s, 'duplicate.flagged', trade.id);
    return;
  }
  const failing = Array.from(latest.values()).filter((c) => c.result === 'fail' && !trade.flaggedUnknownOrFailed.includes(c.checkId));
  if (failing.length > 0) {
    move(s, trade, 'NEEDS_INFO', 'Cashew verification');
    return;
  }
  move(s, trade, 'VERIFIED', 'Cashew verification');
  emit(s, 'trade.verified', trade.id);
}

/** Runs everything that has come due. Called at the start of every API request, and safe to call any number of times. */
export function tick(): void {
  const s = db();
  const clock = Date.now();
  let changed = false;

  for (const run of s.runs) {
    if (run.finished) continue;
    const trade = findTrade(s, run.tradeId);
    for (const step of run.plan) {
      if (step.done) continue;
      if (step.dueAt > clock) break;
      recordCheck(s, trade, step.checkId, step.durationMs);
      step.done = true;
      changed = true;
    }
    if (run.plan.every((step) => step.done)) {
      run.finished = true;
      settleRun(s, trade);
    }
  }

  for (const schedule of s.schedules) {
    if (schedule.done || schedule.dueAt > clock) continue;
    schedule.done = true;
    changed = true;
    deliverScriptedOffer(s, schedule.tradeId, schedule.lenderId);
  }

  for (const trade of s.trades) {
    if (trade.status === 'CONTRACT_SIGNED' && trade.disbursalDueAt && trade.disbursalDueAt <= clock) {
      trade.disbursalDueAt = undefined;
      changed = true;
      commitFinancing(s, trade);
    }
  }
  if (changed) save();
}

function deliverScriptedOffer(s: DemoState, tradeId: string, lenderId: string) {
  const trade = findTrade(s, tradeId);
  if (s.offers.some((o) => o.tradeId === tradeId && o.lenderId === lenderId)) return; // The lender typed its own offer first.
  if (s.declines.some((d) => d.tradeId === tradeId && d.lenderId === lenderId)) return;
  if (trade.status !== 'OFFERS_OPEN') return;
  const product = s.products.find((p) => p.id === trade.eligibility?.find((e) => e.lenderId === lenderId)?.productId);
  if (!product) return;
  const { pricing } = product;
  addOffer(s, trade, lenderId, {
    productName: product.name, advancePct: pricing.advancePct, ratePct: pricing.ratePct, tenureDays: trade.paymentTermsDays, fees: pricing.fees, recourse: pricing.recourse,
    recourseNote: pricing.recourseNote, collateral: pricing.collateral, conditions: pricing.conditions, disbursalHours: pricing.disbursalHours, validityDays: pricing.validityDays,
  }, true);
}

// ---- Exporter decisions --------------------------------------------------------------------

export function flagAndContinue(tradeId: string, actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  tick();
  const latest = latestChecks(s.checks, trade.id);
  if (trade.status !== 'NEEDS_INFO') throw new ApiError('ILLEGAL_TRANSITION', 'There is nothing to flag on this trade.', 409);
  if (latest.get(12)?.flag) throw new ApiError('REVIEW_REQUIRED', 'A possible duplicate has to go to Ops review.', 409);
  const failed = Array.from(latest.values()).filter((c) => c.result === 'fail').map((c) => c.checkId);
  trade.flaggedUnknownOrFailed = Array.from(new Set([...trade.flaggedUnknownOrFailed, ...failed]));
  audit(s, actor, 'verification.flagged', trade.id, { checks: failed });
  openCase(s, trade.id, 'Check 8 failed and flagged');
  move(s, trade, 'VERIFIED', actor);
  save();
}

export function sendToOpsReview(tradeId: string, actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  const check = latestChecks(s.checks, trade.id).get(12);
  if (check?.flag !== 'possible-duplicate') throw new ApiError('NOTHING_TO_REVIEW', 'This trade has no possible duplicate to review.', 409);
  openCase(s, trade.id, 'Possible duplicate', check.evidence);
  audit(s, actor, 'ops.review.requested', trade.id);
  save();
}

export function grantConsent(tradeId: string, flagged: number[], actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  tick();
  if (trade.status !== 'VERIFIED') throw new ApiError('NOT_VERIFIED', 'Finish verification before sharing with lenders.', 409);
  const latest = latestChecks(s.checks, trade.id);
  const allowed = flagged.filter((id) => latest.has(id) && latest.get(id)?.result !== 'pass');
  trade.flaggedUnknownOrFailed = Array.from(new Set([...trade.flaggedUnknownOrFailed, ...allowed]));
  const unmet = unmetMinimumChecks(trade, s.checks);
  if (unmet.length > 0) throw new ApiError('CHECKS_NOT_MET', `Checks ${unmet.join(', ')} must pass or be flagged to lenders first.`, 409);

  const risk = riskFor(s, trade);
  trade.eligibility = decideEligibility(LENDER_ORGS, s.products, {
    trade: { sector: trade.sector, corridor: trade.corridor, buyerCountry: trade.buyerCountry, paymentTermsDays: trade.paymentTermsDays, valueInr: inrValue(trade) },
    docTypes: Array.from(docsOf(s, trade.id).keys()),
    strength: risk.strength,
  });
  const granted = [];
  const expiresAt = new Date(Date.parse(nowIso(s)) + 30 * DAY).toISOString();
  for (const decision of trade.eligibility) {
    if (!decision.eligible || hasActiveConsent(s.consents, decision.lenderId, trade.id, nowIso(s))) continue;
    const consent = { id: nextId(s, 'consent'), orgId: trade.smeId, scope: `trade:${trade.id}`, recipientOrgId: decision.lenderId, purpose: 'Financing offers', grantedAt: nowIso(s), expiresAt };
    s.consents.push(consent);
    granted.push(consent);
    audit(s, actor, 'consent.granted', trade.id, { recipient: decision.lenderName, expiresAt });
  }
  save();
  return granted;
}

export function revokeConsent(consentId: string, orgId: string, actor: string) {
  const s = db();
  const consent = s.consents.find((c) => c.id === consentId);
  if (!consent || consent.orgId !== orgId) throw new ApiError('NOT_FOUND', 'This consent does not exist.', 404);
  if (!consent.revokedAt) {
    consent.revokedAt = nowIso(s);
    audit(s, actor, 'consent.revoked', consent.scope, { recipient: orgName(s, consent.recipientOrgId) });
    save();
  }
  return consent;
}

export function requestOffers(tradeId: string, actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  if (trade.status === 'OFFERS_OPEN') return trade.eligibility ?? [];
  move(s, trade, 'OFFERS_OPEN', actor);
  const eligible = (trade.eligibility ?? []).filter((d) => d.eligible);
  audit(s, actor, 'offers.requested', trade.id, { eligibility: trade.eligibility });
  for (const decision of eligible) {
    const product = s.products.find((p) => p.id === decision.productId)!;
    s.schedules.push({ tradeId, lenderId: decision.lenderId, dueAt: Date.now() + scaled(s, product.pricing.responseSeconds * 1000), done: false });
    notify(s, decision.lenderId, `New trade to review: ${trade.id}.`);
  }
  tick();
  save();
  return trade.eligibility ?? [];
}

// ---- Offers --------------------------------------------------------------------------------

export interface OfferInput {
  productName: string;
  advancePct: number;
  ratePct: number;
  tenureDays: number;
  fees: Fee[];
  recourse: boolean;
  recourseNote?: string;
  collateral: string;
  conditions: string;
  disbursalHours: number;
  validityDays: number;
}

function addOffer(s: DemoState, trade: Trade, lenderId: string, input: OfferInput, scripted: boolean): Offer {
  const offer: Offer = {
    id: nextId(s, 'offer'), tradeId: trade.id, lenderId, productName: input.productName, advancePct: input.advancePct, ratePct: input.ratePct, tenureDays: input.tenureDays,
    fees: input.fees, recourse: input.recourse, recourseNote: input.recourseNote, collateral: input.collateral, conditions: input.conditions, disbursalHours: input.disbursalHours,
    validUntil: new Date(Date.parse(nowIso(s)) + input.validityDays * DAY).toISOString(), status: 'open', scripted, receivedAt: nowIso(s),
  };
  s.offers.push(offer);
  audit(s, scripted ? `${orgName(s, lenderId)} (simulated)` : orgName(s, lenderId), 'offer.submitted', trade.id, { offerId: offer.id });
  emit(s, 'offer.received', trade.id);
  notify(s, trade.smeId, `Offer received from ${orgName(s, lenderId)}.`, 'pass');
  return offer;
}

export function submitOffer(tradeId: string, lenderId: string, input: OfferInput) {
  const s = db();
  const trade = findTrade(s, tradeId);
  if (trade.status !== 'OFFERS_OPEN') throw new ApiError('OFFERS_CLOSED', 'This trade is not open for offers.', 409);
  if (!(input.advancePct > 0 && input.advancePct <= 100)) throw new ApiError('BAD_OFFER', 'Advance must be between 1% and 100%.');
  if (!(input.ratePct >= 0) || !(input.tenureDays > 0)) throw new ApiError('BAD_OFFER', 'Enter a rate and a tenure.');
  s.offers = s.offers.filter((o) => !(o.tradeId === tradeId && o.lenderId === lenderId)); // A new offer replaces this lender's own earlier one.
  const offer = addOffer(s, trade, lenderId, input, false);
  save();
  return offer;
}

export function declineOffer(tradeId: string, lenderId: string) {
  const s = db();
  if (!s.declines.some((d) => d.tradeId === tradeId && d.lenderId === lenderId)) {
    s.declines.push({ tradeId, lenderId });
    audit(s, orgName(s, lenderId), 'offer.declined', tradeId);
    save();
  }
}

export function offerView(s: DemoState, offer: Offer, trade: Trade) {
  const n = normaliseStoredOffer(offer, inrValue(trade));
  return { ...offer, lenderName: orgName(s, offer.lenderId), effectiveApr: n.effectiveApr, netCash: n.netCash, advance: n.advance, interest: n.interest, totalFees: n.totalFees, totalCost: n.totalCost, feeLines: n.feeLines, invoiceValueInr: inrValue(trade), allFees: allFees(offer.fees, offer.conditions) };
}
export type OfferView = ReturnType<typeof offerView>;

export function offersForExporter(tradeId: string, sort: SortKey, actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  const views = s.offers.filter((o) => o.tradeId === tradeId).map((o) => offerView(s, o, trade));
  const ranked = rankOffers(views, sort);
  const order = ranked.map((o) => o.lenderName).join(' > ');
  const key = `${sort}:${order}`;
  if (ranked.length > 0 && s.lastRanking[tradeId] !== key) {
    s.lastRanking[tradeId] = key;
    // Every ranking decision goes in the audit log, and commission isn't an input because it doesn't exist.
    audit(s, actor, 'ranking.computed', tradeId, { sortKey: sort, order, inputs: ranked.map((o) => ({ lender: o.lenderName, effectiveApr: o.effectiveApr, netCash: o.netCash, disbursalHours: o.disbursalHours })) });
    save();
  }
  const best = (key: (o: OfferView) => number) => (ranked.length ? ranked.reduce((a, b) => (key(b) < key(a) ? b : a)).id : undefined);
  const waiting = s.schedules.filter((x) => x.tradeId === tradeId && !x.done).map((x) => orgName(s, x.lenderId));
  const declined = s.declines.filter((x) => x.tradeId === tradeId).map((x) => orgName(s, x.lenderId));
  return { offers: ranked, waiting, declined, badges: { lowestCost: best((o) => o.effectiveApr), fastest: best((o) => o.disbursalHours), mostCash: best((o) => -o.netCash) } };
}

export function acceptOffer(offerId: string, actor: string) {
  const s = db();
  const offer = s.offers.find((o) => o.id === offerId);
  if (!offer) throw new ApiError('NOT_FOUND', 'This offer does not exist.', 404);
  const trade = findTrade(s, offer.tradeId);
  if (offer.status === 'accepted') return offer;
  move(s, trade, 'OFFER_ACCEPTED', actor);
  for (const other of s.offers) if (other.tradeId === trade.id) other.status = other.id === offerId ? 'accepted' : 'expired';
  trade.acceptedOfferId = offerId;
  s.schedules.forEach((x) => { if (x.tradeId === trade.id) x.done = true; });
  audit(s, actor, 'offer.accepted', trade.id, { offerId, lender: orgName(s, offer.lenderId) });
  notify(s, offer.lenderId, `Your offer on ${trade.id} was accepted.`, 'pass');
  save();
  return offer;
}

export function signOffer(offerId: string, otp: string, actor: string) {
  const s = db();
  const offer = s.offers.find((o) => o.id === offerId);
  if (!offer) throw new ApiError('NOT_FOUND', 'This offer does not exist.', 404);
  if (!/^\d{6}$/.test(otp)) throw new ApiError('BAD_OTP', 'Enter the 6-digit code.');
  const trade = findTrade(s, offer.tradeId);
  if (trade.signedAt) return trade;
  move(s, trade, 'CONTRACT_SIGNED', actor);
  trade.signedAt = nowIso(s);
  trade.disbursalDueAt = Date.now() + scaled(s, 2000);
  audit(s, actor, 'contract.signed', trade.id, { offerId, method: 'OTP (simulated)' });
  tick();
  save();
  return trade;
}

function commitFinancing(s: DemoState, trade: Trade) {
  const offer = s.offers.find((o) => o.id === trade.acceptedOfferId);
  if (!offer) throw new ApiError('NO_OFFER', 'This trade has no accepted offer.', 409);
  const lender = orgName(s, offer.lenderId);
  const inv = invoiceIdentity(s, trade);
  const check = checkRegistry(s.registry, s.registryIndex, REGISTRY_SALT, inv, offer.lenderId);
  audit(s, lender, 'registry.checked', trade.id, { code: check.code });
  if (check.code === 'FINANCED_BY_OTHER' || check.code === 'POSSIBLE_DUPLICATE') {
    trade.commitBlocked = true;
    audit(s, 'Cashew registry', 'duplicate.flagged', trade.id, { code: check.code });
    emit(s, 'duplicate.flagged', trade.id);
    return { blocked: true as const, check };
  }
  const entry = appendEntry(s.registry, { fingerprint: check.fingerprint, irnFingerprint: irnFingerprint(REGISTRY_SALT, inv.irn), lenderId: offer.lenderId, status: 'FINANCED', timestamp: nowIso(s) }, registryKeys.privateKey);
  s.registryIndex.push(matchRow(REGISTRY_SALT, entry.position, inv));
  trade.commit = { position: entry.position, fingerprint: entry.fingerprint, entryHash: entry.entryHash, timestamp: entry.timestamp };
  audit(s, lender, 'registry.committed', trade.id, { position: entry.position });
  move(s, trade, 'FINANCED', 'Cashew (simulated disbursal)');
  const view = offerView(s, offer, trade);
  emit(s, 'financing.disbursed', trade.id);
  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(view.netCash);
  notify(s, trade.smeId, `Financed. ₹${inr} is on its way from ${lender}.`, 'pass');
  notify(s, trade.smeId, `${orgName(s, trade.smeId)}: ₹${inr} disbursed against INV ${trade.invoiceNo}. Repayment due in ${offer.tenureDays} days.`, 'info', 'sms');
  notify(s, offer.lenderId, `Financing committed on ${trade.id}.`, 'pass');
  syncShipment(s, trade);
  return { blocked: false as const, check };
}

export function lenderCommit(tradeId: string, lenderId: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  const offer = s.offers.find((o) => o.id === trade.acceptedOfferId);
  if (offer?.lenderId !== lenderId) throw new ApiError('FORBIDDEN', 'Only the accepted lender can commit this trade.', 403);
  if (trade.commit) return { receipt: trade.commit };
  if (trade.status !== 'CONTRACT_SIGNED') throw new ApiError('NOT_SIGNED', 'The contract has to be signed first.', 409);
  trade.disbursalDueAt = undefined;
  const result = commitFinancing(s, trade);
  save();
  if (result.blocked) throw new ApiError('REGISTRY_BLOCKED', 'This invoice has already been financed through Cashew. Details of the other lender are not shared.', 409);
  return { receipt: trade.commit };
}

export function registryLookup(tradeId: string | undefined, sample: 'exact' | 'altered' | undefined, lenderId?: string): RegistryCheck {
  const s = db();
  let inv: InvoiceIdentity;
  if (tradeId) inv = invoiceIdentity(s, findTrade(s, tradeId));
  else {
    const set: DocSetId = sample === 'altered' ? 'C2' : 'C1';
    const raw = extractedFor(set, 'invoice', new Date());
    inv = { supplierId: CKS, buyerId: SAMPLE_TRADES[set].buyerId, invoiceNo: String(raw.invoiceNo.value), amount: Number(raw.amount.value), date: String(raw.invoiceDate.value), currency: 'USD', irn: String(raw.irn.value) };
  }
  const result = checkRegistry(s.registry, s.registryIndex, REGISTRY_SALT, inv, lenderId);
  audit(s, lenderId ? orgName(s, lenderId) : 'Cashew registry', 'registry.checked', tradeId ?? `sample:${sample}`, { code: result.code });
  save();
  return result;
}

export function registryView() {
  const s = db();
  const masks = new Map<string, string>();
  const masked = (id: string) => {
    if (!masks.has(id)) masks.set(id, `Lender #${masks.size + 1}`);
    return masks.get(id)!;
  };
  const entries = s.registry.map(({ lenderId, ...entry }) => ({ ...entry, lender: masked(lenderId) }));
  return { entries, chainLength: entries.length, head: entries[entries.length - 1]?.entryHash, lastAnchoredAt: s.lastAnchoredAt };
}

export const verifyRegistryChain = () => verifyChain(db().registry, registryKeys.publicKey);

export function anchorRegistry() {
  const s = db();
  s.lastAnchoredAt = nowIso(s);
  audit(s, 'Cashew registry', 'registry.anchored', 'registry', { simulated: true });
  save();
  return { head: s.registry[s.registry.length - 1]?.entryHash, simulated: true, at: s.lastAnchoredAt };
}

// ---- Risk, evidence, views -----------------------------------------------------------------

export function riskFor(s: DemoState, trade: Trade, weights?: number[]) {
  const results = new Map<number, CheckResult>();
  for (const [id, check] of latestChecks(s.checks, trade.id)) results.set(id, check.result);
  return computeRisk(trade.id, results, trade.paymentTermsDays, weights, nowIso(s));
}

export function evidenceBundle(tradeId: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  const latest = latestChecks(s.checks, tradeId);
  const active = s.runs.find((r) => r.tradeId === tradeId && !r.finished);
  const clock = Date.now();
  const checks = CHECKS.map((def) => {
    const step = active?.plan.find((p) => p.checkId === def.id && !p.done);
    const done = latest.get(def.id);
    const running = step && step.startAt <= clock;
    return {
      checkId: def.id, title: def.title, source: def.source, mode: def.mode,
      state: running ? ('running' as const) : step || !done ? ('waiting' as const) : ('done' as const),
      result: done?.result, flag: done?.flag, line: done?.line, evidence: done?.evidence, evidenceHash: done?.evidenceHash, runAt: done?.runAt, durationMs: done?.durationMs,
      versions: s.checks.filter((c) => c.tradeId === tradeId && c.checkId === def.id).length,
    };
  });
  const settled = checks.filter((c) => c.state === 'done');
  const count = (result: CheckResult) => settled.filter((c) => c.result === result).length;
  const summary = { pass: count('pass'), fail: count('fail'), unknown: count('unknown'), pending: count('pending') + checks.filter((c) => c.state !== 'done').length };
  const extracted = Object.fromEntries(Array.from(docsOf(s, tradeId), ([type, doc]) => [type, doc.extracted]));
  return { tradeId, running: Boolean(active), started: latest.size > 0 || Boolean(active), checks, summary, extracted, flagged: trade.flaggedUnknownOrFailed, bundleHash: sha256(canonicalJSON({ checks: Array.from(latest.values()).map((c) => c.evidenceHash), extracted })) };
}

export function tradeView(s: DemoState, trade: Trade) {
  const docs = Array.from(docsOf(s, trade.id).values());
  const risk = s.checks.some((c) => c.tradeId === trade.id) ? riskFor(s, trade) : undefined;
  const offer = s.offers.find((o) => o.id === trade.acceptedOfferId);
  const offered = s.offers.filter((o) => o.tradeId === trade.id).map((o) => Date.parse(o.receivedAt));
  const consented = s.consents.filter((c) => c.scope === `trade:${trade.id}`).map((c) => Date.parse(c.grantedAt));
  const firstOfferSeconds = offered.length && consented.length ? Math.max(0, (Math.min(...offered) - Math.min(...consented)) / 1000) : undefined;
  return {
    firstOfferSeconds,
    ...trade, smeName: orgName(s, trade.smeId), buyerName: buyerName(s, trade.buyerId), valueInr: inrValue(trade), docs,
    strength: risk?.strength, band: risk?.band, blocking: risk?.blocking ?? [], risk, offerCount: s.offers.filter((o) => o.tradeId === trade.id).length,
    acceptedOffer: offer ? offerView(s, offer, trade) : undefined,
    openCases: s.queue.filter((c) => c.tradeId === trade.id && c.status !== 'closed').map((c) => ({ id: c.id, reason: c.reason, status: c.status })),
    lastDecision: [...s.queue].reverse().find((c) => c.tradeId === trade.id && c.decision)?.decision,
  };
}
export type TradeView = ReturnType<typeof tradeView>;

// ---- Ops -----------------------------------------------------------------------------------

export function opsDecision(caseId: string, decision: OpsDecision, note: string) {
  const s = db();
  const item = s.queue.find((c) => c.id === caseId);
  if (!item) throw new ApiError('NOT_FOUND', 'This case does not exist.', 404);
  if (!note?.trim()) throw new ApiError('NOTE_REQUIRED', 'Add a note to record why.');
  if (!['confirm-duplicate', 'clear', 'ask-info'].includes(decision)) throw new ApiError('BAD_DECISION', 'Choose a decision.');
  if (item.status === 'closed') return item;
  item.decision = { decision, note, by: OPS_USER, at: nowIso(s) };
  item.status = decision === 'ask-info' ? 'waiting' : 'closed';
  audit(s, OPS_USER, 'ops.decision', item.tradeId, { caseId, reason: item.reason, decision, note, humanOverride: true });
  const trade = findTrade(s, item.tradeId);

  if (item.reason === 'Possible duplicate' && decision !== 'ask-info') {
    const def = checkDef(12);
    const confirm = decision === 'confirm-duplicate';
    const outcome = { result: confirm ? ('fail' as const) : ('pass' as const), line: confirm ? 'Ops confirmed this is a duplicate of an invoice already financed.' : 'Ops reviewed the possible duplicate and cleared it.', evidence: { reviewedBy: OPS_USER, note, decision } };
    s.checks.push({ id: nextId(s, 'chk'), tradeId: trade.id, checkId: 12, result: outcome.result, line: outcome.line, source: def.source, mode: def.mode, evidence: outcome.evidence, evidenceHash: sha256(canonicalJSON(outcome.evidence)), runAt: nowIso(s), durationMs: 0 });
    if (trade.status === 'NEEDS_INFO') {
      move(s, trade, confirm ? 'REJECTED_VERIFICATION' : 'VERIFIED', OPS_USER);
    }
  }
  const words = { 'confirm-duplicate': 'Ops confirmed this is a duplicate.', clear: 'Ops cleared this case.', 'ask-info': `Ops asked for more information: ${note}` };
  notify(s, trade.smeId, words[decision], decision === 'clear' ? 'pass' : decision === 'ask-info' ? 'warn' : 'fail');
  save();
  return item;
}

// ---- Products ------------------------------------------------------------------------------

const PRODUCT_FIELDS: Array<keyof LenderProduct> = ['type', 'minTicket', 'maxTicket', 'sectors', 'corridors', 'buyerCountries', 'maxTenureDays', 'minStrength', 'requiredDocs', 'pricingModel', 'collateralRules', 'active'];

export function updateProduct(productId: string, lenderId: string, patch: Partial<LenderProduct>) {
  const s = db();
  const product = s.products.find((p) => p.id === productId);
  if (!product || product.lenderId !== lenderId) throw new ApiError('NOT_FOUND', 'This product does not exist.', 404);
  const clean = Object.fromEntries(PRODUCT_FIELDS.filter((key) => key in patch).map((key) => [key, patch[key]]));
  Object.assign(product, clean);
  if (!(product.minTicket <= product.maxTicket)) throw new ApiError('BAD_RANGE', 'The minimum ticket has to be at or below the maximum.');
  audit(s, orgName(s, lenderId), 'product.updated', productId, clean);
  save();
  return product;
}

// ---- Passport ------------------------------------------------------------------------------

export function passportFor(orgId: string) {
  const s = db();
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org) throw new ApiError('NOT_FOUND', 'This organisation does not exist.', 404);
  const trades = s.trades.filter((t) => t.smeId === orgId);
  const share = [...s.consents].reverse().find((c) => c.orgId === orgId && c.scope === 'passport' && !c.revokedAt);
  const consent = share ? { recipient: orgName(s, share.recipientOrgId), purpose: share.purpose, expiry: share.expiresAt.slice(0, 10) } : undefined;
  const passport = issuePassport(org, trades, nowIso(s), consent, passportKeys.privateKey, passportPublicKeyB64);
  if (s.lastPassportHash[orgId] !== passport.proof.signature) {
    s.lastPassportHash[orgId] = passport.proof.signature;
    audit(s, 'Cashew', 'passport.issued', orgId, { tier: passport.claims.tier, completedTrades: passport.claims.completedTrades });
    save();
  }
  const done = trades.filter((t) => t.status === 'REPAID' || t.status === 'CLOSED');
  return { passport, onTimeRate: done.length ? Math.round((done.filter((t) => t.repaidOnTime).length / done.length) * 100) : 0, shares: s.consents.filter((c) => c.orgId === orgId && c.scope === 'passport') };
}

export function sharePassport(orgId: string, recipientOrgId: string, purpose: string, actor: string) {
  const s = db();
  if (!LENDER_ORGS.some((l) => l.id === recipientOrgId)) throw new ApiError('BAD_RECIPIENT', 'Choose a lender.');
  const consent = { id: nextId(s, 'consent'), orgId, scope: 'passport', recipientOrgId, purpose: purpose || 'Credit assessment', grantedAt: nowIso(s), expiresAt: new Date(Date.parse(nowIso(s)) + 30 * DAY).toISOString() };
  s.consents.push(consent);
  audit(s, actor, 'consent.granted', 'passport', { recipient: orgName(s, recipientOrgId), purpose: consent.purpose });
  save();
  return consent;
}

export const passportTier = (orgId: string, s: DemoState = db()) => tierFor(claimsFrom(s.trades.filter((t) => t.smeId === orgId)).completedTrades);

// ---- Demo controls -------------------------------------------------------------------------

/** The newest live trade: what the demo controls act on. */
export function activeTrade(s: DemoState = db()): Trade | undefined {
  return [...s.trades].reverse().find((t) => !t.history && !t.seededRace && !['REJECTED_VERIFICATION', 'WITHDRAWN'].includes(t.status));
}

const SHIPMENT = ['', 'Loaded', 'Sailed', 'Arrived', 'Delivered'];
export const SHIPMENT_STAGES = SHIPMENT.slice(1);

function syncShipment(s: DemoState, trade: Trade) {
  const actor = 'Carrier (simulated)';
  if (trade.status === 'FINANCED' && trade.shipmentStage >= 2) move(s, trade, 'SHIPMENT_IN_TRANSIT', actor);
  if (trade.status === 'SHIPMENT_IN_TRANSIT' && trade.shipmentStage >= 4) {
    trade.deliveredOnTime = true;
    move(s, trade, 'DELIVERED', actor);
  }
}

function setShipment(s: DemoState, trade: Trade, stage: number, by: string) {
  while (trade.shipmentStage < stage) {
    trade.shipmentStage += 1;
    trade.shipmentLog.push({ stage: trade.shipmentStage, at: nowIso(s), by });
    audit(s, by, 'shipment.advanced', trade.id, { stage: SHIPMENT[trade.shipmentStage] });
    emit(s, 'shipment.updated', trade.id);
    if (trade.shipmentStage === 2 && latestChecks(s.checks, trade.id).get(7)?.result === 'unknown') recordCheck(s, trade, 7, 0);
  }
  syncShipment(s, trade);
}

export function confirmDelivered(tradeId: string, actor: string) {
  const s = db();
  const trade = findTrade(s, tradeId);
  if (!trade.commit) throw new ApiError('NOT_FINANCED', 'Goods delivered can be confirmed once the trade is financed.', 409);
  setShipment(s, trade, 4, actor);
  notify(s, trade.smeId, 'Goods delivered confirmed.', 'pass');
  save();
  return trade;
}

function repay(s: DemoState, trade: Trade) {
  setShipment(s, trade, 4, 'Carrier (simulated)');
  if (trade.status === 'DELIVERED') move(s, trade, 'BUYER_ACCEPTED', 'Buyer (simulated)');
  if (trade.status !== 'BUYER_ACCEPTED') return false;
  move(s, trade, 'REPAID', 'Buyer payment (simulated)');
  trade.repaidAt = nowIso(s);
  trade.repaidOnTime = true;
  if (trade.commit) {
    const opened = s.registry.find((e) => e.position === trade.commit!.position)!;
    const entry = appendEntry(s.registry, { fingerprint: opened.fingerprint, irnFingerprint: opened.irnFingerprint, lenderId: opened.lenderId, status: 'SETTLED', refersTo: opened.position, timestamp: nowIso(s) }, registryKeys.privateKey);
    audit(s, 'Cashew registry', 'registry.committed', trade.id, { position: entry.position, status: 'SETTLED' });
  }
  audit(s, 'Buyer payment (simulated)', 'repayment.received', trade.id);
  emit(s, 'repayment.received', trade.id);
  notify(s, trade.smeId, 'Repayment received. Your Passport has been updated.', 'pass');
  return true;
}

function addAttempt(attempt: 1 | 2) {
  const s = db();
  if (s.scenario !== 'C') throw new ApiError('WRONG_SCENARIO', 'Switch to Scenario C first.', 409);
  const existing = s.trades.find((t) => t.attempt === attempt && !t.history);
  if (existing) return existing;
  const set: DocSetId = attempt === 1 ? 'C1' : 'C2';
  const sample = SAMPLE_TRADES[set];
  const actor = orgName(s, exporterId(s));
  const trade = createTrade({ ...sample, docSet: set }, actor);
  for (const type of DOC_TYPES) attachDocument(trade.id, type, actor);
  startVerification(trade.id, actor, undefined, 0.35); // The presenter has about 25 seconds for this beat (10.1).
  return trade;
}

export type AdvanceWhat = 'shipment' | 'buyer-confirm' | 'lenders-respond' | 'time-30d' | 'repaid' | 'duplicate-1' | 'duplicate-2';

/** Every control can be pressed twice without breaking anything (10.3). */
export function demoAdvance(what: AdvanceWhat): { ok: boolean; message: string; tradeId?: string } {
  const s = db();
  tick();
  if (what === 'duplicate-1' || what === 'duplicate-2') {
    const trade = addAttempt(what === 'duplicate-1' ? 1 : 2);
    return { ok: true, message: `Attempt ${what.slice(-1)} is on ${trade.id}.`, tradeId: trade.id };
  }
  if (what === 'time-30d') {
    s.clockOffsetDays += 30;
    audit(s, 'Demo control', 'demo.time.advanced', 'clock', { days: 30, total: s.clockOffsetDays });
    save();
    return { ok: true, message: `Demo clock moved on 30 days (${s.clockOffsetDays} in total).` };
  }
  // The script ends on Kaveri's Passport right after Scenario C (10.1), and switching scenario resets.
  if (what === 'repaid' && s.scenario === 'C') return finishKaveriStory();
  const trade = activeTrade(s);
  if (!trade) return { ok: false, message: 'Start a trade first.' };

  if (what === 'buyer-confirm') {
    if (trade.buyerConfirmed) return { ok: true, message: 'The buyer has already confirmed.', tradeId: trade.id };
    trade.buyerConfirmed = true;
    audit(s, 'Buyer link (simulated)', 'buyer.confirmed', trade.id);
    const ran = latestChecks(s.checks, trade.id).has(14) && !s.runs.some((r) => r.tradeId === trade.id && !r.finished);
    if (ran) recordCheck(s, trade, 14, 0);
    save();
    return { ok: true, message: 'Buyer confirmed.', tradeId: trade.id };
  }
  if (what === 'lenders-respond') {
    const due = s.schedules.filter((x) => x.tradeId === trade.id && !x.done);
    if (due.length === 0) return { ok: true, message: 'No lenders are waiting to respond.', tradeId: trade.id };
    due.forEach((x) => { x.dueAt = 0; });
    tick();
    return { ok: true, message: 'All lenders have responded.', tradeId: trade.id };
  }
  if (what === 'shipment') {
    if (trade.shipmentStage >= 4) return { ok: true, message: 'The shipment is already delivered.', tradeId: trade.id };
    setShipment(s, trade, trade.shipmentStage + 1, 'Carrier (simulated)');
    save();
    return { ok: true, message: `Shipment: ${SHIPMENT[trade.shipmentStage]}.`, tradeId: trade.id };
  }
  // what === 'repaid'
  if (trade.status === 'REPAID' || trade.status === 'CLOSED') return { ok: true, message: 'This trade is already repaid.', tradeId: trade.id };
  if (!trade.commit) return { ok: false, message: 'Finance a trade before advancing to repayment.', tradeId: trade.id };
  repay(s, trade);
  save();
  return { ok: true, message: 'Trade repaid. The Passport has been updated.', tradeId: trade.id };
}

/** Loads Scenario B and runs its trade to repayment through the same functions the screens use. */
function finishKaveriStory() {
  const speed = db().speed;
  const s = demoReset('B');
  s.speed = 0;
  const actor = orgName(s, KAVERI);
  const trade = createTrade({ ...SAMPLE_TRADES.B, docSet: 'B' }, actor);
  for (const type of DOC_TYPES) attachDocument(trade.id, type, actor);
  startVerification(trade.id, actor);
  attachDocument(trade.id, 'invoice', actor);
  startVerification(trade.id, actor, 8);
  trade.buyerConfirmed = true;
  recordCheck(s, trade, 14, 0);
  grantConsent(trade.id, [], actor);
  requestOffers(trade.id, actor);
  tick();
  const best = offersForExporter(trade.id, 'cost', actor).offers[0];
  acceptOffer(best.id, actor);
  signOffer(best.id, '123456', actor);
  tick();
  repay(s, trade);
  s.speed = speed;
  s.notifications = []; // Its offer and financing messages would bury the closing screen.
  save();
  return { ok: true, message: 'Loaded Kaveri Textiles with its trade repaid. The Passport has been updated.', tradeId: trade.id };
}

export function demoReset(scenario?: ScenarioId) {
  const s = reset(scenario);
  audit(s, 'Demo control', 'demo.reset', 'store', { scenario: s.scenario });
  save();
  return s;
}
