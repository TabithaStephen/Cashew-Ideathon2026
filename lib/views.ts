// Role-scoped projections returned by the API.
import { activeConsent, canSee, evidenceView, latestDocs, riskFor } from './service';
import { computeOffer } from './engines/matching';
import { lenderMask, currentStatus } from './engines/registry';
import { nowMs, orgName } from './store';
import type { DemoState, Session, Trade } from './types';
import { SHIPMENT_STAGES } from './types';
import { inr } from './format';

export function tradeRow(s: DemoState, sess: Session, t: Trade) {
  const buyer = s.buyers.find((b) => b.id === t.buyerId)!;
  const hasChecks = s.checks.some((c) => c.tradeId === t.id);
  const risk = hasChecks ? riskFor(s, t) : null;
  const myReq = sess.role === 'lender' ? s.offerRequests.find((r) => r.tradeId === t.id && r.lenderId === sess.orgId) : undefined;
  const myOffer = sess.role === 'lender' ? s.offers.find((o) => o.tradeId === t.id && o.lenderId === sess.orgId && o.status !== 'expired') : undefined;
  const accepted = t.acceptedOfferId ? s.offers.find((o) => o.id === t.acceptedOfferId) : undefined;
  let offerStatus: string | undefined;
  if (sess.role === 'lender') {
    if (accepted?.lenderId === sess.orgId) offerStatus = 'Accepted';
    else if (accepted) offerStatus = 'Not selected';
    else if (myOffer) offerStatus = 'Offer sent';
    else if (myReq?.status === 'declined') offerStatus = 'Declined';
    else offerStatus = 'Not responded';
  }
  return {
    id: t.id, invoiceNo: t.invoiceNo, buyer: buyer.name, buyerCountry: buyer.country, exporter: orgName(s, t.smeId), smeId: t.smeId,
    value: t.value, currency: t.currency, fx: t.fx, status: t.status, updatedAt: t.updatedAt, createdAt: t.createdAt, corridor: t.corridor,
    historical: !!t.historical, band: risk?.band, strength: risk?.strength, requestedAt: t.offersRequestedAt ?? myReq?.createdAt,
    offerStatus, financedByMe: accepted?.lenderId === sess.orgId && ['FINANCED', 'SHIPMENT_IN_TRANSIT', 'DELIVERED', 'BUYER_ACCEPTED', 'REPAID', 'CLOSED', 'CONTRACT_SIGNED'].includes(t.status),
    offersCount: s.offers.filter((o) => o.tradeId === t.id && o.status !== 'expired').length,
    advanceInr: t.advanceInr,
  };
}

export function listTrades(s: DemoState, sess: Session) {
  return s.trades.filter((t) => canSee(s, sess, t)).map((t) => tradeRow(s, sess, t)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const TIMELINE = ['Submitted', 'Verified', 'Offers', 'Financed', 'Shipped', 'Delivered', 'Repaid'] as const;
export function timelineIndex(t: Trade): number {
  const st = t.status;
  if (['REPAID', 'CLOSED'].includes(st)) return 7;
  if (['DELIVERED', 'BUYER_ACCEPTED'].includes(st)) return 6;
  if (st === 'SHIPMENT_IN_TRANSIT') return 5;
  if (st === 'FINANCED') return 4;
  if (['OFFERS_OPEN', 'OFFER_ACCEPTED', 'CONTRACT_SIGNED'].includes(st)) return 3;
  if (st === 'VERIFIED') return 2;
  if (['SUBMITTED', 'VERIFYING', 'NEEDS_INFO'].includes(st)) return 1;
  return 0;
}

export function nextAction(s: DemoState, t: Trade): { title: string; body: string; tab?: string; href?: string } {
  const ev = evidenceView(s, t.id);
  const docs = Object.keys(latestDocs(s, t.id)).length;
  switch (t.status) {
    case 'DRAFT': return docs < 5 ? { title: 'Add documents', body: `${docs} of 5 documents uploaded.`, href: `/app/trades/new?trade=${t.id}&step=2` } : { title: 'Run verification', body: 'All five documents are in. Run the 14 checks.', href: `/app/trades/new?trade=${t.id}&step=3` };
    case 'SUBMITTED': case 'VERIFYING': return { title: 'Verification running', body: `${ev.checks.filter((c) => c.state === 'done').length} of 14 checks complete.`, tab: 'verification' };
    case 'NEEDS_INFO': return { title: 'Fix a failed check', body: ev.checks.find((c) => c.record && ['fail', 'warn'].includes(c.record.result))?.record?.line ?? 'A check needs attention.', href: `/app/trades/new?trade=${t.id}&step=3` };
    case 'VERIFIED': return { title: 'Share with lenders', body: 'Verified. Consent once and lenders can send sealed offers.', href: `/app/trades/new?trade=${t.id}&step=4` };
    case 'OFFERS_OPEN': { const n = s.offers.filter((o) => o.tradeId === t.id && o.status === 'open').length; return { title: n ? 'Compare offers' : 'Waiting for offers', body: n ? `${n} sealed offer${n > 1 ? 's' : ''} received. Ranked by what they cost you.` : 'Lenders are reviewing your verified trade.', tab: 'offers' }; }
    case 'OFFER_ACCEPTED': return { title: 'Sign the contract', body: 'Sign with OTP to receive funds.', tab: 'offers' };
    case 'CONTRACT_SIGNED': return t.registryBlock ? { title: 'Financing blocked', body: 'The duplicate-financing registry blocked this invoice.', tab: 'financing' } : { title: 'Disbursal in progress', body: 'Funds are on the way.', tab: 'financing' };
    case 'FINANCED': case 'SHIPMENT_IN_TRANSIT': return { title: 'Track your shipment', body: `Shipment: ${SHIPMENT_STAGES[t.shipmentStage ?? 0]}. Confirm milestones as they happen.`, tab: 'tracking' };
    case 'DELIVERED': case 'BUYER_ACCEPTED': return { title: 'Awaiting buyer payment', body: 'Delivered. Repayment is due at the end of the term.', tab: 'financing' };
    case 'REPAID': case 'CLOSED': return { title: 'Trade complete', body: 'Repaid on time. Your Trade Passport has been updated.', href: '/app/passport' };
    default: return { title: t.status.replace(/_/g, ' ').toLowerCase(), body: '' };
  }
}

export function workspace(s: DemoState, sess: Session, t: Trade) {
  const buyer = s.buyers.find((b) => b.id === t.buyerId)!;
  const org = s.orgs.find((o) => o.id === t.smeId)!;
  const docs = latestDocs(s, t.id);
  const versions = s.docs.filter((d) => d.tradeId === t.id).map((d) => ({ id: d.id, type: d.type, version: d.version, fileName: d.fileName, uploadedAt: d.uploadedAt, sha256: d.sha256, amended: d.amended }));
  const hasChecks = s.checks.some((c) => c.tradeId === t.id);
  const accepted = t.acceptedOfferId ? s.offers.find((o) => o.id === t.acceptedOfferId) : undefined;
  const acceptedVisible = accepted && (sess.role !== 'lender' || accepted.lenderId === sess.orgId);
  const maths = accepted ? computeOffer(accepted, t.value * t.fx) : undefined;
  const consents = sess.role === 'lender' ? [] : s.consents.filter((c) => c.scope === `trade:${t.id}`).map((c) => ({ ...c, recipient: orgName(s, c.recipientOrgId), active: !c.revokedAt && new Date(c.expiresAt).getTime() > nowMs(s) }));
  const repayment = maths && t.disbursedAt ? {
    dueAt: new Date(new Date(t.disbursedAt).getTime() + accepted!.tenureDays * 86_400_000).toISOString(),
    amount: maths.advance + maths.interest, principal: maths.advance, interest: maths.interest,
  } : undefined;
  return {
    trade: { ...t, timelineIndex: timelineIndex(t), shipmentStageName: SHIPMENT_STAGES[t.shipmentStage ?? 0] },
    org: { id: org.id, legalName: org.legalName, shortName: org.shortName, city: org.city, gstin: org.gstin },
    buyer, docs, versions,
    risk: hasChecks ? riskFor(s, t) : null,
    consents,
    myConsent: sess.role === 'lender' ? activeConsent(s, t.id, sess.orgId) : undefined,
    accepted: acceptedVisible ? { offer: accepted, maths, lender: orgName(s, accepted!.lenderId) } : undefined,
    repayment: acceptedVisible ? repayment : undefined,
    nextAction: sess.role === 'exporter' ? nextAction(s, t) : undefined,
    cases: sess.role === 'lender' ? [] : s.opsQueue.filter((c) => c.tradeId === t.id),
    offersOpen: t.status === 'OFFERS_OPEN',
    smsPreview: sess.role === 'exporter' ? s.notifications.filter((n) => n.kind === 'sms' && n.tradeId === t.id).at(-1) : undefined,
    netCashText: maths ? inr(maths.netCash) : undefined,
  };
}

export function registryView(s: DemoState, sess: Session) {
  const mask = lenderMask(s.registry);
  return s.registry.map((e) => ({
    position: e.position, fingerprint: e.fingerprint, status: e.status, currentStatus: e.status === 'FINANCED' ? currentStatus(s.registry, e.position) : e.status,
    lender: mask[e.lenderId] + (sess.role === 'lender' && e.lenderId === sess.orgId ? ' (you)' : ''),
    timestamp: e.timestamp, entryHash: e.entryHash, prevHash: e.prevHash, refPosition: e.refPosition, signature: e.signature, hasIrn: !!e.irnFingerprint,
  })).reverse();
}
