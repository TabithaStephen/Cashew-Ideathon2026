export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { ApiError, requireTrade, startVerification } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ checkId?: number }>(req);
  const id = seg(req, 'trades');
  requireTrade(s, sess, id);
  if (sess.role === 'lender') throw new ApiError(403, 'FORBIDDEN', 'Lenders cannot run verification.');
  const run = await startVerification(s, sess, id, b.checkId ? [Number(b.checkId)] : undefined);
  return { runId: run.id, checkIds: run.checkIds };
});
