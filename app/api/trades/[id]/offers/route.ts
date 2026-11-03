export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { offersView } from '@/lib/service';
import { badgesFor, type SortKey } from '@/lib/engines/matching';
import { orgName } from '@/lib/store';

export const GET = handle((s, sess, req) => {
  const sort = (req.nextUrl.searchParams.get('sort') ?? 'cost') as SortKey;
  const v = offersView(s, sess, seg(req, 'trades'), sort);
  const badges = badgesFor(v.offers);
  return {
    tradeId: v.trade.id, status: v.trade.status, valueInr: v.valueInr, sealed: sess.role === 'lender' && !v.trade.offerWindowClosed,
    acceptedOfferId: v.trade.acceptedOfferId ?? null,
    offers: v.offers.map((r) => ({ ...r, lender: orgName(s, r.offer.lenderId), badges: badges[r.offer.id] ?? [] })),
    requests: v.requests.map((r) => ({ id: r.id, lenderId: r.lenderId, lender: orgName(s, r.lenderId), status: r.status, eligible: r.eligible, reasons: sess.role === 'lender' ? [] : r.reasons, dueAt: r.dueAt })),
    serverNow: Date.now() + s.clockOffsetMs,
  };
});
