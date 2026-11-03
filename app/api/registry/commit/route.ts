export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { ApiError, commitFinancing, requireTrade } from '@/lib/service';
import { nowMs } from '@/lib/store';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ tradeId: string }>(req);
  const t = requireTrade(s, sess, b.tradeId);
  const accepted = s.offers.find((o) => o.id === t.acceptedOfferId);
  if (!accepted || accepted.lenderId !== sess.orgId) throw new ApiError(403, 'FORBIDDEN', 'Only the lender whose offer was accepted can commit financing.');
  if (!['CONTRACT_SIGNED', 'FINANCED', 'SHIPMENT_IN_TRANSIT', 'DELIVERED', 'BUYER_ACCEPTED', 'REPAID', 'CLOSED'].includes(t.status)) throw new ApiError(409, 'NOT_SIGNED', 'The exporter has not signed yet.');
  const r = commitFinancing(s, t, sess.orgId);
  if (r.committed && t.status === 'CONTRACT_SIGNED' && !t.disbursalDueAt) t.disbursalDueAt = nowMs(s) + (s.speed === 0 ? 0 : 2000 / s.speed);
  return { result: r.check.result, committed: r.committed, receipt: t.registryReceipt ?? null };
}, { roles: ['lender'] });
