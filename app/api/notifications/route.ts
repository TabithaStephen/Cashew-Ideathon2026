export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';

export const GET = handle((s, sess, req) => {
  if (!sess) return { epoch: s.epoch, latestId: s.notifications.at(-1)?.id ?? 0, items: [] };
  const after = Number(req.nextUrl.searchParams.get('after') ?? 0);
  const mine = s.notifications.filter((n) => (!n.audience.role || n.audience.role === sess.role) && (!n.audience.orgId || n.audience.orgId === sess.orgId));
  return { epoch: s.epoch, latestId: s.notifications.at(-1)?.id ?? 0, items: mine.filter((n) => n.id > after) };
}, { open: true });
