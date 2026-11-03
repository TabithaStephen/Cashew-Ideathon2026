export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { eligibilityFor, requestOffers, requireTrade } from '@/lib/service';
import { orgName } from '@/lib/store';

export const POST = handle((s, sess, req) => {
  const reqs = requestOffers(s, sess, seg(req, 'trades'));
  return reqs.map((r) => ({ ...r, lender: orgName(s, r.lenderId) }));
}, { roles: ['exporter'] });

/** Eligibility preview (and "Why did Meridian not receive this?" for Ops). */
export const GET = handle((s, sess, req) => {
  const t = requireTrade(s, sess, seg(req, 'trades'));
  const stored = s.offerRequests.filter((r) => r.tradeId === t.id);
  if (stored.length && sess.role !== 'lender') return stored.map((r) => ({ ...r, lender: orgName(s, r.lenderId) }));
  return eligibilityFor(s, t).filter((e) => sess.role !== 'lender' || e.lenderId === sess.orgId).map((e) => ({ ...e, lender: orgName(s, e.lenderId), preview: true }));
}, { roles: ['exporter', 'ops'] });
