export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { canSee } from '@/lib/service';

export const GET = handle((s, sess, req) => {
  const tradeId = req.nextUrl.searchParams.get('tradeId');
  let ev = s.audit;
  if (tradeId) ev = ev.filter((e) => e.object === tradeId || e.object.startsWith(`${tradeId}/`) || e.object === `trade:${tradeId}`);
  if (sess.role !== 'ops') {
    const visible = new Set(s.trades.filter((t) => canSee(s, sess, t)).map((t) => t.id));
    ev = ev.filter((e) => [...visible].some((id) => e.object === id || e.object.startsWith(`${id}/`) || e.object === `trade:${id}`));
    if (sess.role === 'lender') ev = ev.filter((e) => !/offer\.|ranking|consent/.test(e.action) || e.actor.includes(s.orgs.find((o) => o.id === sess.orgId)!.shortName));
  }
  return [...ev].reverse();
});
