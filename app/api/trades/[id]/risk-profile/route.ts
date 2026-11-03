export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { requireTrade, riskFor } from '@/lib/service';

export const GET = handle((s, sess, req) => {
  const t = requireTrade(s, sess, seg(req, 'trades'));
  const w = req.nextUrl.searchParams.get('w');
  const weights = w ? w.split(',').map(Number) : undefined;
  return riskFor(s, t, weights);
});
