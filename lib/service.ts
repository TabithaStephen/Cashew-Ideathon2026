// Domain operations on the store. Route handlers call these; tests call them directly.
import { sha256 } from './crypto';
import { audit, emit, findTrade, nextId, notify, nowIso, nowMs, orgName } from './store';
import type {
  CheckResult, ConsentArtefact, DemoState, Doc, DocType, Offer, OfferRequest, OpsCase, Session, Trade, TradeStatus, VerificationCheck,
} from './types';
import { DOC_LABELS, DOC_TYPES, SHIPMENT_STAGES } from './types';
import { SAMPLES, STAGED_BY_ORG, resolveDates, type SampleKey } from './seed/scenarios';
import { CHECKS, buildSchedule, invoiceIdentity, runCheck, type TradeContext } from './engines/verification';
import { computeRiskProfile } from './engines/risk';
import { appendEntry, checkRegistry, type RegistryCheck } from './engines/registry';
import { checkEligibility, computeOffer, offerFromProduct, rankOffers, type SortKey } from './engines/matching';
import { transition, TransitionError } from './engines/state';
import { FX_USD_INR, inr } from './format';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// ---------------- access rules (13.4) ----------------
export function activeConsent(s: DemoState, tradeId: string, lenderId: string): ConsentArtefact | undefined {
  const now = nowMs(s);
  return s.consents.find((c) => c.scope === `trade:${tradeId}` && c.recipientOrgId === lenderId && !c.revokedAt && new Date(c.expiresAt).getTime() > now);
}
export function canSee(s: DemoState, sess: Session, t: Trade): boolean {
  if (sess.role === 'ops') return true;
  if (sess.role === 'exporter') return t.smeId === sess.orgId;
  return !t.historical && !!activeConsent(s, t.id, sess.orgId);
}
export function requireTrade(s: DemoState, sess: Session, id: string): Trade {
  const t = findTrade(s, id);
  if (!t) throw new ApiError(404, 'NOT_FOUND', `Trade ${id} not found.`);
  if (!canSee(s, sess, t)) throw new ApiError(sess.role === 'lender' ? 403 : 404, sess.role === 'lender' ? 'CONSENT_REQUIRED' : 'NOT_FOUND', sess.role === 'lender' ? 'No active consent from the exporter for this trade.' : `Trade ${id} not found.`);
  return t;
}
const actorOf = (s: DemoState, sess: Session) => (sess.role === 'ops' ? 'ops:Asha' : `${sess.role}:${orgName(s, sess.orgId)}`);

function move(s: DemoState, t: Trade, to: TradeStatus, actor: string) {
  try {
    transition(t, to, actor, { checkResults: latestResults(s, t.id), audit: (a, act, o, m) => audit(s, a, act, o, m), now: nowIso(s) });
  } catch (e) {
    if (e instanceof TransitionError) throw new ApiError(409, e.code, e.message);
    throw e;
  }
}
function moveVia(s: DemoState, t: Trade, path: TradeStatus[], actor: string) { for (const st of path) if (t.status !== st) move(s, t, st, actor); }

// ---------------- trades & documents ----------------
export function createTrade(s: DemoState, sess: Session, input: { sample?: SampleKey; buyerId?: string; goods?: string; hsCode?: string; value?: number; currency?: string; incoterm?: string; paymentTermsDays?: number; invoiceNo?: string; attempt?: 1 | 2 }) {
  if (sess.role !== 'exporter') throw new ApiError(403, 'FORBIDDEN', 'Only exporters create trades.');
  const sample = SAMPLES[input.sample ?? (s.scenario === 'C' ? 'C1' : s.scenario)];
  const buyerId = input.buyerId ?? sample.buyerId;
  const buyer = s.buyers.find((b) => b.id === buyerId);
  if (!buyer) throw new ApiError(400, 'BAD_REQUEST', 'Unknown buyer.');
  const id = `TRD-2627-${String(1000 + s.trades.filter((x) => !x.historical).length + 1).padStart(4, '0')}`;
  const t: Trade = {
    id, smeId: sess.orgId, buyerId, corridor: `IN-${buyer.country === 'GB' ? 'GB' : 'EU'}`, hsCode: input.hsCode ?? sample.hsCode,
    goods: input.goods ?? sample.goods, invoiceNo: input.invoiceNo ?? sample.invoiceNo,
    value: input.value ?? sample.value, currency: input.currency ?? 'USD', fx: FX_USD_INR, incoterm: input.incoterm ?? sample.incoterm,
    paymentTermsDays: input.paymentTermsDays ?? sample.paymentTermsDays, status: 'DRAFT', scenario: sample.scenario,
    flaggedUnknownOrFailed: [], createdAt: nowIso(s), updatedAt: nowIso(s), buyerConfirmed: false, shipmentStage: 0, attempt: input.attempt,
  };
  (t as Trade & { sampleKey: SampleKey }).sampleKey = sample.key;
  s.trades.push(t);
  audit(s, actorOf(s, sess), 'trade.created', t.id, { sample: sample.key, value: t.value, currency: t.currency });
  return t;
}
const sampleOf = (t: Trade) => SAMPLES[((t as Trade & { sampleKey?: SampleKey }).sampleKey) ?? (t.scenario === 'C' ? 'C1' : t.scenario)];

export function latestDocs(s: DemoState, tradeId: string): Partial<Record<DocType, Doc>> {
  const out: Partial<Record<DocType, Doc>> = {};
  for (const d of s.docs) if (d.tradeId === tradeId && (!out[d.type] || d.version > out[d.type]!.version)) out[d.type] = d;
  return out;
}

/** REAL upload (file hashed and stored as metadata); STAGED extraction (seeded JSON for the slot). */
export function uploadDocument(s: DemoState, sess: Session, tradeId: string, input: { type: DocType; fileName: string; bytes: Uint8Array; amended?: boolean }) {
  const t = requireTrade(s, sess, tradeId);
  if (sess.role !== 'exporter') throw new ApiError(403, 'FORBIDDEN', 'Only the exporter uploads documents.');
  if (!DOC_TYPES.includes(input.type)) throw new ApiError(400, 'BAD_REQUEST', 'Unknown document type.');
  const sample = sampleOf(t);
  const prev = latestDocs(s, tradeId)[input.type];
  const amended = !!input.amended && input.type === 'invoice' && !!sample.amendedInvoice;
  const extraction = amended && input.type === 'invoice' && sample.amendedInvoice ? sample.amendedInvoice : sample.docs[input.type];
  const doc: Doc = {
    id: nextId(s, 'doc'), tradeId, type: input.type, fileName: input.fileName, sizeBytes: input.bytes.length,
    sha256: sha256(input.bytes), extracted: resolveDates(extraction, nowMs(s) - s.clockOffsetMs), verifiedStatus: 'pending',
    version: (prev?.version ?? 0) + 1, uploadedAt: nowIso(s), amended: amended && input.type === 'invoice',
  };
  s.docs.push(doc);
  audit(s, actorOf(s, sess), 'document.uploaded', `${tradeId}/${input.type}`, { fileName: doc.fileName, sha256: doc.sha256, version: doc.version });
  const low = Object.entries(doc.extracted.fields).filter(([, f]) => f.confidence < 0.85).map(([k]) => k);
  audit(s, 'system', 'document.extracted', `${tradeId}/${input.type}`, { fields: Object.keys(doc.extracted.fields).length, needsReview: low });
  if (doc.type === 'invoice') {
    const inv = doc.extracted.fields;
    t.value = Number(inv.amount?.value ?? t.value);
    t.invoiceNo = String(inv.invoiceNo?.value ?? t.invoiceNo);
  }
  if (low.length) openCase(s, tradeId, 'Low-confidence extraction', { document: DOC_LABELS[doc.type], fields: low.map((k) => ({ field: k, value: doc.extracted.fields[k].value, confidence: doc.extracted.fields[k].confidence })) });
  return doc;
}

export function reviewField(s: DemoState, sess: Session, tradeId: string, docId: string, field: string) {
  requireTrade(s, sess, tradeId);
  const d = s.docs.find((x) => x.id === docId && x.tradeId === tradeId);
  if (!d || !d.extracted.fields[field]) throw new ApiError(404, 'NOT_FOUND', 'Field not found.');
  d.extracted.fields[field].reviewed = true;
  audit(s, actorOf(s, sess), 'document.field_reviewed', `${tradeId}/${d.type}`, { field, value: d.extracted.fields[field].value });
  return d;
}

// ---------------- verification ----------------
export function latestChecks(s: DemoState, tradeId: string): Record<number, VerificationCheck> {
  const out: Record<number, VerificationCheck> = {};
  for (const c of s.checks) if (c.tradeId === tradeId) out[c.checkId] = c; // appended in order → last wins
  return out;
}
export function latestResults(s: DemoState, tradeId: string): Record<number, CheckResult> {
  return Object.fromEntries(Object.entries(latestChecks(s, tradeId)).map(([k, v]) => [k, v.result]));
}

function context(s: DemoState, t: Trade): TradeContext {
  return {
    trade: t, org: s.orgs.find((o) => o.id === t.smeId)!, buyer: s.buyers.find((b) => b.id === t.buyerId)!,
    docs: latestDocs(s, t.id), staged: STAGED_BY_ORG[t.smeId] ?? {}, registry: s.registry, registryIndex: s.registryIndex, now: nowIso(s),
  };
}

export async function startVerification(s: DemoState, sess: Session | null, tradeId: string, checkIds?: number[]) {
  const t = findTrade(s, tradeId);
  if (!t) throw new ApiError(404, 'NOT_FOUND', 'Trade not found.');
  if (sess) requireTrade(s, sess, tradeId);
  const docs = latestDocs(s, tradeId);
  if (!checkIds && Object.keys(docs).length < 5) throw new ApiError(409, 'DOCUMENTS_MISSING', 'Upload all five documents before running verification.');
  const active = s.runs.find((r) => r.tradeId === tradeId && !r.finished);
  if (active) return active; // idempotent
  const actor = sess ? actorOf(s, sess) : 'system';
  if (t.status === 'DRAFT') move(s, t, 'SUBMITTED', actor);
  if (t.status === 'SUBMITTED' || t.status === 'NEEDS_INFO' || t.status === 'VERIFIED') move(s, t, 'VERIFYING', actor);
  const ids = checkIds ?? CHECKS.map((c) => c.id);
  const run = { id: nextId(s, 'run'), tradeId, startedAt: nowMs(s), checkIds: ids, schedule: buildSchedule(ids, s.speed), done: [] as number[], finished: false };
  s.runs.push(run);
  audit(s, actor, 'verification.started', tradeId, { checks: ids, speed: s.speed });
  await tick(s);
  return run;
}

async function completeRunItems(s: DemoState) {
  const now = nowMs(s);
  for (const run of s.runs) {
    if (run.finished) continue;
    const t = findTrade(s, run.tradeId);
    if (!t) { run.finished = true; continue; }
    for (const item of run.schedule) {
      if (run.done.includes(item.checkId)) continue;
      if (run.startedAt + item.startMs + item.durationMs > now) break;
      run.done.push(item.checkId);
      const out = await runCheck(item.checkId, context(s, t));
      const rec: VerificationCheck = {
        id: nextId(s, 'chk'), tradeId: t.id, checkId: item.checkId, result: out.result, line: out.line, source: out.source, mode: out.mode,
        evidence: out.evidence, evidenceHash: out.evidenceHash, runAt: new Date(run.startedAt + item.startMs + item.durationMs).toISOString(),
        durationMs: item.durationMs, runId: run.id,
      };
      s.checks.push(rec);
      audit(s, 'system', 'verification.check.completed', t.id, { checkId: rec.checkId, result: rec.result, evidenceHash: rec.evidenceHash });
      if (rec.checkId === 12 && rec.result === 'warn') {
        openCase(s, t.id, 'Possible duplicate', (rec.evidence as { similarity?: unknown }).similarity);
        emit(s, 'duplicate.flagged', t.id, { kind: 'POSSIBLE_DUPLICATE' });
      }
      if (rec.checkId === 12 && rec.result === 'fail') emit(s, 'duplicate.flagged', t.id, { kind: 'FINANCED_BY_OTHER' });
    }
    if (run.done.length === run.schedule.length) {
      run.finished = true;
      finishVerification(s, t);
    }
  }
}

function finishVerification(s: DemoState, t: Trade) {
  const results = latestResults(s, t.id);
  const profile = computeRiskProfile(t.id, results, t.paymentTermsDays, undefined, nowIso(s));
  s.riskProfiles.push(profile);
  if (t.status !== 'VERIFYING') return; // single-check re-runs after offers (e.g. check 7/14) don't move status
  const blockingFail = Object.entries(results).some(([id, r]) => (r === 'fail' || r === 'warn') && !t.flaggedUnknownOrFailed.includes(Number(id)));
  move(s, t, blockingFail ? 'NEEDS_INFO' : 'VERIFIED', 'system');
  if (!blockingFail) emit(s, 'trade.verified', t.id, { strength: profile.strength, band: profile.band });
}

export interface CheckView { checkId: number; title: string; source: string; mode: 'staged' | 'real'; state: 'idle' | 'pending' | 'running' | 'done'; record?: VerificationCheck; history: number; }
export function evidenceView(s: DemoState, tradeId: string) {
  const latest = latestChecks(s, tradeId);
  const run = [...s.runs].reverse().find((r) => r.tradeId === tradeId);
  const now = nowMs(s);
  const checks: CheckView[] = CHECKS.map((c) => {
    let state: CheckView['state'] = latest[c.id] ? 'done' : 'idle';
    if (run && !run.finished && run.checkIds.includes(c.id) && !run.done.includes(c.id)) {
      const item = run.schedule.find((x) => x.checkId === c.id)!;
      state = now >= run.startedAt + item.startMs ? 'running' : 'pending';
    }
    return { checkId: c.id, title: c.title, source: c.source, mode: c.mode, state, record: latest[c.id], history: s.checks.filter((x) => x.tradeId === tradeId && x.checkId === c.id).length };
  });
  const counts = { pass: 0, fail: 0, unknown: 0, pending: 0, warn: 0 };
  for (const c of checks) if (c.record && c.state === 'done') counts[c.record.result]++;
  const docs = latestDocs(s, tradeId);
  const bundleCore = { tradeId, checks: checks.filter((c) => c.record).map((c) => ({ id: c.checkId, result: c.record!.result, evidenceHash: c.record!.evidenceHash, runAt: c.record!.runAt })), documents: Object.values(docs).map((d) => ({ type: d!.type, sha256: d!.sha256, version: d!.version })) };
  return { running: !!run && !run.finished, runCheckIds: run?.checkIds ?? [], checks, counts, bundleHash: sha256(JSON.stringify(bundleCore)), bundle: bundleCore };
}

export function riskFor(s: DemoState, t: Trade, weights?: number[]) {
  return computeRiskProfile(t.id, latestResults(s, t.id), t.paymentTermsDays, weights, nowIso(s));
}

// ---------------- ops cases ----------------
export function openCase(s: DemoState, tradeId: string, reason: OpsCase['reason'], detail?: unknown) {
  const existing = s.opsQueue.find((c) => c.tradeId === tradeId && c.reason === reason && c.status === 'open');
  if (existing) return existing;
  const c: OpsCase = { id: nextId(s, 'case'), tradeId, reason, createdAt: nowIso(s), status: 'open', reviewer: 'Asha', detail };
  s.opsQueue.push(c);
  audit(s, 'system', 'ops.case_opened', tradeId, { caseId: c.id, reason });
  notify(s, { kind: 'toast', tone: 'warn', audience: { role: 'ops' }, text: `New review case: ${reason} (${tradeId}).`, tradeId });
  return c;
}

export function decideCase(s: DemoState, sess: Session, caseId: string, outcome: NonNullable<OpsCase['decision']>['outcome'], note: string) {
  if (sess.role !== 'ops') throw new ApiError(403, 'FORBIDDEN', 'Only Ops can decide review cases.');
  if (!note?.trim()) throw new ApiError(400, 'NOTE_REQUIRED', 'A note is required for every decision.');
  const c = s.opsQueue.find((x) => x.id === caseId);
  if (!c) throw new ApiError(404, 'NOT_FOUND', 'Case not found.');
  if (c.status === 'decided') return c; // idempotent
  c.status = 'decided';
  c.decision = { outcome, note: note.trim(), by: 'Asha (Cashew Ops)', at: nowIso(s) };
  audit(s, 'ops:Asha', 'ops.decision', c.tradeId, { caseId, reason: c.reason, outcome, note: c.decision.note, humanOverride: true });
  const t = findTrade(s, c.tradeId);
  if (!t) return c;
  if (c.reason === 'Possible duplicate') {
    if (outcome === 'Clear, not a duplicate') {
      appendOverride(s, t, 12, 'pass', `Cleared by Ops review (Asha): ${c.decision.note}`);
      if (t.status === 'NEEDS_INFO') { move(s, t, 'VERIFYING', 'ops:Asha'); finishVerification(s, t); }
    } else if (outcome === 'Confirm duplicate') {
      appendOverride(s, t, 12, 'fail', `Confirmed duplicate by Ops review (Asha): ${c.decision.note}`);
      if (t.status === 'NEEDS_INFO') moveVia(s, t, ['VERIFYING', 'REJECTED_VERIFICATION'], 'ops:Asha');
    }
  }
  if (outcome === 'Ask exporter for more info') notify(s, { kind: 'toast', tone: 'warn', audience: { role: 'exporter', orgId: t.smeId }, text: `Cashew Ops asked for more information on ${t.id}.`, tradeId: t.id });
  return c;
}

function appendOverride(s: DemoState, t: Trade, checkId: number, result: CheckResult, line: string) {
  const prev = latestChecks(s, t.id)[checkId];
  const evidence = { humanOverride: true, reviewer: 'Asha (Cashew Ops)', previous: prev ? { result: prev.result, evidenceHash: prev.evidenceHash } : null, ruleVersion: 'rules-v0.1' };
  s.checks.push({ id: nextId(s, 'chk'), tradeId: t.id, checkId, result, line, source: 'Ops review', mode: 'real', evidence, evidenceHash: sha256(JSON.stringify(evidence)), runAt: nowIso(s), durationMs: 0, runId: 'override' });
}

// ---------------- consent, matching, offers ----------------
export function grantConsent(s: DemoState, sess: Session, input: { scope: string; recipientOrgId: string; recipientLabel?: string; purpose: string; days?: number }) {
  const c: ConsentArtefact = {
    id: nextId(s, 'cns'), orgId: sess.orgId, scope: input.scope, recipientOrgId: input.recipientOrgId, recipientLabel: input.recipientLabel,
    purpose: input.purpose, createdAt: nowIso(s), expiresAt: new Date(nowMs(s) + (input.days ?? 30) * 86_400_000).toISOString(),
  };
  s.consents.push(c);
  audit(s, actorOf(s, sess), 'consent.granted', input.scope, { consentId: c.id, recipient: input.recipientLabel ?? orgName(s, input.recipientOrgId), purpose: c.purpose, expiresAt: c.expiresAt });
  return c;
}
export function revokeConsent(s: DemoState, sess: Session, id: string) {
  const c = s.consents.find((x) => x.id === id);
  if (!c || (sess.role !== 'ops' && c.orgId !== sess.orgId)) throw new ApiError(404, 'NOT_FOUND', 'Consent not found.');
  if (!c.revokedAt) { c.revokedAt = nowIso(s); audit(s, actorOf(s, sess), 'consent.revoked', c.scope, { consentId: id }); }
  return c;
}

export function eligibilityFor(s: DemoState, t: Trade) {
  const buyer = s.buyers.find((b) => b.id === t.buyerId)!;
  const strength = riskFor(s, t).strength;
  const docsPresent = Object.keys(latestDocs(s, t.id)) as DocType[];
  return s.products.map((p) => checkEligibility(p, { valueInr: t.value * t.fx, tenureDays: t.paymentTermsDays, sector: 'Textiles and apparel', corridor: t.corridor, buyerCountry: buyer.country, docsPresent, strength }));
}

export function flagChecks(s: DemoState, sess: Session, tradeId: string, checkIds: number[]) {
  const t = requireTrade(s, sess, tradeId);
  for (const id of checkIds) if (!t.flaggedUnknownOrFailed.includes(id)) t.flaggedUnknownOrFailed.push(id);
  audit(s, actorOf(s, sess), 'verification.flagged_to_lenders', tradeId, { checkIds });
  const results = latestResults(s, tradeId);
  if (checkIds.includes(8) && results[8] === 'fail') openCase(s, tradeId, 'Check 8 failed and flagged', { line: latestChecks(s, tradeId)[8]?.line });
  return t;
}

export function requestOffers(s: DemoState, sess: Session, tradeId: string) {
  const t = requireTrade(s, sess, tradeId);
  if (sess.role !== 'exporter') throw new ApiError(403, 'FORBIDDEN', 'Only the exporter opens a trade to lenders.');
  if (t.status === 'OFFERS_OPEN' || s.offerRequests.some((r) => r.tradeId === tradeId)) return s.offerRequests.filter((r) => r.tradeId === tradeId); // idempotent
  const results = latestResults(s, tradeId);
  // Unknown and pending results are passed to lenders honestly, as they are.
  const honest = Object.entries(results).filter(([, r]) => r === 'unknown' || r === 'pending').map(([k]) => Number(k));
  for (const id of honest) if (!t.flaggedUnknownOrFailed.includes(id)) t.flaggedUnknownOrFailed.push(id);
  if (t.status === 'NEEDS_INFO') {
    const unflagged = Object.entries(results).filter(([id, r]) => (r === 'fail' || r === 'warn') && !t.flaggedUnknownOrFailed.includes(Number(id)));
    if (unflagged.length) throw new ApiError(409, 'MINIMUM_CHECKS', `Resolve or flag check ${unflagged.map(([k]) => k).join(', ')} before opening to lenders.`);
    moveVia(s, t, ['VERIFYING', 'VERIFIED'], actorOf(s, sess));
  }
  if (t.status !== 'VERIFIED') throw new ApiError(409, 'NOT_VERIFIED', 'Run verification before opening to lenders.');
  move(s, t, 'OFFERS_OPEN', actorOf(s, sess));
  t.offersRequestedAt = nowIso(s);
  const elig = eligibilityFor(s, t);
  const reqs = elig.map((e) => {
    const p = s.products.find((x) => x.id === e.productId)!;
    if (e.eligible) grantConsent(s, sess, { scope: `trade:${tradeId}`, recipientOrgId: e.lenderId, purpose: 'Trade finance offer', days: 30 });
    const r: OfferRequest = { id: nextId(s, 'req'), tradeId, lenderId: e.lenderId, eligible: e.eligible, reasons: e.reasons,
      dueAt: e.eligible ? nowMs(s) + (s.speed === 0 ? 0 : (p.pricing.responseSeconds * 1000) / s.speed) : null,
      status: e.eligible ? 'requested' : 'not-sent', createdAt: nowIso(s) };
    return r;
  });
  s.offerRequests.push(...reqs);
  audit(s, actorOf(s, sess), 'offers.requested', tradeId, { requested: reqs.filter((r) => r.eligible).map((r) => orgName(s, r.lenderId)), notSent: reqs.filter((r) => !r.eligible).map((r) => ({ lender: orgName(s, r.lenderId), reasons: r.reasons })) });
  for (const r of reqs) if (r.eligible) notify(s, { kind: 'toast', tone: 'info', audience: { role: 'lender', orgId: r.lenderId }, text: `New verified trade ${tradeId} shared with you.`, tradeId });
  return reqs;
}

function addOffer(s: DemoState, o: Offer) {
  s.offers.push(o);
  const req = s.offerRequests.find((r) => r.tradeId === o.tradeId && r.lenderId === o.lenderId);
  if (req) req.status = 'responded';
  const t = findTrade(s, o.tradeId)!;
  audit(s, `lender:${orgName(s, o.lenderId)}`, 'offer.submitted', o.tradeId, { offerId: o.id, scripted: o.scripted });
  emit(s, 'offer.received', o.tradeId, { offerId: o.id });
  notify(s, { kind: 'toast', tone: 'success', audience: { role: 'exporter', orgId: t.smeId }, text: `Offer received from ${orgName(s, o.lenderId)}.`, tradeId: o.tradeId });
}

export function submitOffer(s: DemoState, sess: Session, input: Omit<Offer, 'id' | 'lenderId' | 'status' | 'submittedAt' | 'scripted' | 'validUntil'> & { validDays?: number }) {
  if (sess.role !== 'lender') throw new ApiError(403, 'FORBIDDEN', 'Only lenders submit offers.');
  const t = requireTrade(s, sess, input.tradeId);
  if (t.status !== 'OFFERS_OPEN') throw new ApiError(409, 'OFFERS_CLOSED', 'This trade is not open for offers.');
  const existing = s.offers.find((o) => o.tradeId === t.id && o.lenderId === sess.orgId && o.status === 'open');
  if (existing) existing.status = 'expired'; // a lender's newer sealed offer supersedes its own earlier one
  const o: Offer = {
    id: nextId(s, 'off'), tradeId: t.id, lenderId: sess.orgId, advancePct: Number(input.advancePct), ratePct: Number(input.ratePct), tenureDays: Number(input.tenureDays),
    fees: (input.fees ?? []).map((f) => ({ label: f.label, kind: f.kind, value: Number(f.value), statedIn: f.statedIn })),
    recourse: !!input.recourse, recourseLabel: input.recourse ? 'Recourse' : 'Non-recourse', collateral: input.collateral || 'None', conditions: input.conditions ?? '',
    validUntil: new Date(nowMs(s) + (input.validDays ?? 7) * 86_400_000).toISOString(), status: 'open', disbursalHours: Number(input.disbursalHours ?? 48),
    submittedAt: nowIso(s), scripted: false, productId: input.productId,
  };
  if (!(o.advancePct > 0 && o.advancePct <= 1) || !(o.ratePct >= 0 && o.ratePct < 1) || !(o.tenureDays > 0)) throw new ApiError(400, 'BAD_REQUEST', 'Advance, rate and tenure are out of range.');
  addOffer(s, o);
  return o;
}

export function offersView(s: DemoState, sess: Session, tradeId: string, sort: SortKey = 'cost') {
  const t = requireTrade(s, sess, tradeId);
  let offers = s.offers.filter((o) => o.tradeId === tradeId && o.status !== 'expired');
  // Sealed bids: a lender sees only its own offer until the exporter accepts.
  if (sess.role === 'lender' && !t.offerWindowClosed) offers = offers.filter((o) => o.lenderId === sess.orgId);
  const V = t.value * t.fx;
  const ranked = rankOffers(offers.map((offer) => ({ offer, maths: computeOffer(offer, V) })), sort);
  const sig = ranked.map((r) => r.offer.id).join(',') + '|' + sort;
  const meta = s as DemoState & { _rankSig?: Record<string, string> };
  meta._rankSig ??= {};
  if (sess.role === 'exporter' && ranked.length && meta._rankSig[tradeId] !== sig) {
    meta._rankSig[tradeId] = sig;
    audit(s, 'system', 'ranking.computed', tradeId, { sortKey: sort, order: ranked.map((r) => ({ lender: orgName(s, r.offer.lenderId), effectiveAPR: Number(r.maths.effectiveAPR.toFixed(6)) })), inputs: ['effectiveAPR', 'disbursalHours', 'netCash'], commission: 'not an input' });
  }
  const requests = s.offerRequests.filter((r) => r.tradeId === tradeId && (sess.role !== 'lender' || r.lenderId === sess.orgId));
  return { trade: t, valueInr: V, offers: ranked, requests };
}

export function acceptOffer(s: DemoState, sess: Session, offerId: string) {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) throw new ApiError(404, 'NOT_FOUND', 'Offer not found.');
  const t = requireTrade(s, sess, o.tradeId);
  if (sess.role !== 'exporter') throw new ApiError(403, 'FORBIDDEN', 'Only the exporter accepts offers.');
  if (t.acceptedOfferId === o.id) return o; // idempotent
  if (t.acceptedOfferId) throw new ApiError(409, 'ALREADY_ACCEPTED', 'Another offer has already been accepted.');
  if (new Date(o.validUntil).getTime() < nowMs(s)) throw new ApiError(409, 'OFFER_EXPIRED', 'This offer has expired.');
  move(s, t, 'OFFER_ACCEPTED', actorOf(s, sess));
  o.status = 'accepted';
  t.acceptedOfferId = o.id; t.offerWindowClosed = true;
  for (const r of s.offerRequests) if (r.tradeId === t.id && r.status === 'requested') r.status = 'declined';
  audit(s, actorOf(s, sess), 'offer.accepted', t.id, { offerId: o.id, lender: orgName(s, o.lenderId) });
  notify(s, { kind: 'toast', tone: 'success', audience: { role: 'lender', orgId: o.lenderId }, text: `Your offer on ${t.id} was accepted.`, tradeId: t.id });
  return o;
}

export function registryIdentityFor(s: DemoState, t: Trade) {
  return invoiceIdentity(context(s, t));
}

/** Lender commit: registry check, then append. Blocks on FINANCED_BY_OTHER / POSSIBLE_DUPLICATE. */
export function commitFinancing(s: DemoState, t: Trade, lenderId: string): { check: RegistryCheck; committed: boolean } {
  const id = registryIdentityFor(s, t);
  if (!id) throw new ApiError(409, 'NO_INVOICE', 'No invoice on file.');
  if (t.registryReceipt) return { check: { result: 'NONE', fingerprint: t.registryReceipt.fingerprint }, committed: true }; // idempotent
  const check = checkRegistry(s.registry, s.registryIndex, id, lenderId);
  audit(s, `lender:${orgName(s, lenderId)}`, 'registry.checked', t.id, { result: check.result, fingerprint: check.fingerprint });
  const cleared = latestChecks(s, t.id)[12]?.source === 'Ops review' && latestChecks(s, t.id)[12]?.result === 'pass';
  if (check.result === 'FINANCED_BY_OTHER' || (check.result === 'POSSIBLE_DUPLICATE' && !cleared)) {
    t.registryBlock = { result: check.result, at: nowIso(s) };
    emit(s, 'duplicate.flagged', t.id, { result: check.result, stage: 'commit' });
    notify(s, { kind: 'toast', tone: 'danger', audience: { role: 'lender', orgId: lenderId }, text: `Registry blocked financing of ${t.id}: ${check.result === 'FINANCED_BY_OTHER' ? 'already financed elsewhere' : 'possible duplicate under review'}.`, tradeId: t.id });
    notify(s, { kind: 'toast', tone: 'danger', audience: { role: 'exporter', orgId: t.smeId }, text: `Financing of ${t.id} was blocked by the duplicate-financing registry.`, tradeId: t.id });
    if (check.result === 'POSSIBLE_DUPLICATE') openCase(s, t.id, 'Possible duplicate', check.similarity);
    return { check, committed: false };
  }
  const e = appendEntry(s.registry, s.registryIndex, { identity: id, lenderId, status: 'FINANCED', timestamp: nowIso(s) });
  t.registryReceipt = { fingerprint: e.fingerprint, position: e.position, entryHash: e.entryHash, timestamp: e.timestamp };
  t.registryBlock = null;
  audit(s, `lender:${orgName(s, lenderId)}`, 'registry.committed', t.id, { position: e.position, fingerprint: e.fingerprint, entryHash: e.entryHash });
  return { check, committed: true };
}

export function signOffer(s: DemoState, sess: Session, offerId: string, otp: string) {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) throw new ApiError(404, 'NOT_FOUND', 'Offer not found.');
  const t = requireTrade(s, sess, o.tradeId);
  if (!/^\d{6}$/.test(otp ?? '')) throw new ApiError(400, 'BAD_OTP', 'Enter the 6-digit code.');
  if (t.acceptedOfferId !== o.id) throw new ApiError(409, 'NOT_ACCEPTED', 'Accept this offer first.');
  if (t.status === 'OFFER_ACCEPTED') {
    move(s, t, 'CONTRACT_SIGNED', actorOf(s, sess));
    t.signedAt = nowIso(s);
    audit(s, actorOf(s, sess), 'contract.signed', t.id, { offerId, method: 'OTP e-sign (simulated)' });
  }
  if (t.status !== 'CONTRACT_SIGNED') return { trade: t, committed: !!t.registryReceipt };
  const { committed } = commitFinancing(s, t, o.lenderId);
  if (committed && !t.disbursalDueAt) t.disbursalDueAt = nowMs(s) + (s.speed === 0 ? 0 : 2000 / s.speed);
  return { trade: t, committed };
}

function disburse(s: DemoState, t: Trade) {
  const o = s.offers.find((x) => x.id === t.acceptedOfferId)!;
  const m = computeOffer(o, t.value * t.fx);
  move(s, t, 'FINANCED', 'system');
  t.disbursedAt = nowIso(s); t.advanceInr = Math.round(m.advance);
  const org = s.orgs.find((x) => x.id === t.smeId)!;
  emit(s, 'financing.disbursed', t.id, { lender: orgName(s, o.lenderId), netCash: Math.round(m.netCash) });
  notify(s, { kind: 'toast', tone: 'success', audience: { role: 'exporter', orgId: t.smeId }, text: `${inr(m.netCash)} disbursed by ${orgName(s, o.lenderId)}.`, tradeId: t.id });
  notify(s, { kind: 'sms', tone: 'success', audience: { role: 'exporter', orgId: t.smeId }, text: `${org.shortName}: ${inr(m.netCash)} disbursed against INV ${t.invoiceNo} by ${orgName(s, o.lenderId)}. Repayment due in ${o.tenureDays} days. Reply HELP for support. – Cashew`, tradeId: t.id });
  if ((t.shipmentStage ?? 0) >= 1) syncShipmentStatus(s, t);
}

// ---------------- lifecycle (shipment, buyer, repayment) ----------------
function syncShipmentStatus(s: DemoState, t: Trade) {
  const stage = t.shipmentStage ?? 0;
  if (['FINANCED'].includes(t.status) && stage >= 1 && stage < 4) move(s, t, 'SHIPMENT_IN_TRANSIT', 'system');
  if (['FINANCED', 'SHIPMENT_IN_TRANSIT'].includes(t.status) && stage >= 4) move(s, t, 'DELIVERED', 'system');
}

export async function advanceShipment(s: DemoState, t: Trade, actor: string, toStage?: number) {
  const before = t.shipmentStage ?? 0;
  const target = Math.min(4, toStage ?? before + 1);
  if (target <= before) return t; // idempotent at Delivered
  t.shipmentStage = target;
  audit(s, actor, 'shipment.advanced', t.id, { from: SHIPMENT_STAGES[before], to: SHIPMENT_STAGES[target] });
  emit(s, 'shipment.updated', t.id, { stage: SHIPMENT_STAGES[target] });
  notify(s, { kind: 'toast', tone: 'info', audience: { role: 'exporter', orgId: t.smeId }, text: `Shipment ${SHIPMENT_STAGES[target].toLowerCase()} for ${t.id}.`, tradeId: t.id });
  syncShipmentStatus(s, t);
  if (before < 2 && target >= 2 && s.checks.some((c) => c.tradeId === t.id)) await startVerification(s, null, t.id, [7]);
  return t;
}

export async function buyerConfirms(s: DemoState, t: Trade) {
  if (t.buyerConfirmed) return t;
  t.buyerConfirmed = true;
  audit(s, 'buyer', 'buyer.confirmed', t.id, { channel: 'Secure link (simulated)' });
  notify(s, { kind: 'toast', tone: 'success', audience: { role: 'exporter', orgId: t.smeId }, text: `Buyer confirmed ${t.invoiceNo}.`, tradeId: t.id });
  if (s.checks.some((c) => c.tradeId === t.id)) await startVerification(s, null, t.id, [14]);
  return t;
}

export async function advanceToRepayment(s: DemoState, t: Trade) {
  if (['REPAID', 'CLOSED'].includes(t.status)) return t;
  if (!['FINANCED', 'SHIPMENT_IN_TRANSIT', 'DELIVERED', 'BUYER_ACCEPTED'].includes(t.status)) throw new ApiError(409, 'NOT_FINANCED', `${t.id} is not financed yet.`);
  if ((t.shipmentStage ?? 0) < 4) await advanceShipment(s, t, 'demo', 4);
  if (t.status === 'DELIVERED') move(s, t, 'BUYER_ACCEPTED', 'buyer');
  move(s, t, 'REPAID', 'system');
  t.repaidAt = nowIso(s);
  const rec = t.registryReceipt;
  if (rec) {
    const ref = s.registry[rec.position - 1];
    appendEntry(s.registry, s.registryIndex, { fingerprint: ref.fingerprint, irnFp: ref.irnFingerprint, lenderId: ref.lenderId, status: 'SETTLED', timestamp: nowIso(s), refPosition: ref.position });
    audit(s, 'system', 'registry.committed', t.id, { status: 'SETTLED', refPosition: ref.position });
  }
  emit(s, 'repayment.received', t.id, { on: 'time' });
  audit(s, 'system', 'repayment.received', t.id, {});
  audit(s, 'system', 'passport.issued', t.smeId, { reason: 'Trade repaid, history updated' });
  notify(s, { kind: 'toast', tone: 'success', audience: { role: 'exporter', orgId: t.smeId }, text: `Repayment received for ${t.id}. Your Trade Passport has been updated.`, tradeId: t.id });
  return t;
}

// ---------------- tick: materialise anything that has come due ----------------
export async function tick(s: DemoState) {
  await completeRunItems(s);
  const now = nowMs(s);
  for (const r of s.offerRequests) {
    if (r.status !== 'requested' || r.dueAt === null || r.dueAt > now) continue;
    const t = findTrade(s, r.tradeId);
    if (!t || t.status !== 'OFFERS_OPEN') { r.status = 'declined'; continue; }
    if (s.offers.some((o) => o.tradeId === r.tradeId && o.lenderId === r.lenderId && o.status !== 'expired')) { r.status = 'responded'; continue; }
    const p = s.products.find((x) => x.lenderId === r.lenderId)!;
    addOffer(s, offerFromProduct(p, r.tradeId, t.paymentTermsDays, new Date(now), nextId(s, 'off')));
  }
  for (const t of s.trades) if (t.status === 'CONTRACT_SIGNED' && t.disbursalDueAt && t.disbursalDueAt <= now) disburse(s, t);
  for (const o of s.offers) if (o.status === 'open' && new Date(o.validUntil).getTime() < now) o.status = 'expired';
}

/** The trade demo controls act on: most recent active (non-historical) trade, optionally filtered. */
export function focusTrade(s: DemoState, pred: (t: Trade) => boolean = () => true): Trade | undefined {
  return [...s.trades].filter((t) => !t.historical && pred(t)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))[0];
}
