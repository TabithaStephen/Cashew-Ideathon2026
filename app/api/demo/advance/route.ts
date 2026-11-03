export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { advance, type AdvanceWhat } from '@/lib/demo/controls';
import { ApiError } from '@/lib/service';

const WHAT: AdvanceWhat[] = ['shipment', 'buyer-confirm', 'lenders-respond', 'time-30d', 'repaid', 'duplicate-1', 'duplicate-2'];
export const POST = handle(async (s, _sess, req) => {
  const b = await body<{ what: AdvanceWhat; tradeId?: string }>(req);
  if (!WHAT.includes(b.what)) throw new ApiError(400, 'BAD_REQUEST', `what must be one of ${WHAT.join(', ')}.`);
  return advance(s, b.what, b.tradeId);
}, { open: true });
