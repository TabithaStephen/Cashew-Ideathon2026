export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { evidenceView, latestDocs, requireTrade } from '@/lib/service';

export const GET = handle((s, sess, req) => {
  const t = requireTrade(s, sess, seg(req, 'trades'));
  const ev = evidenceView(s, t.id);
  return { tradeId: t.id, status: t.status, flagged: t.flaggedUnknownOrFailed, ...ev, documents: latestDocs(s, t.id) };
});
