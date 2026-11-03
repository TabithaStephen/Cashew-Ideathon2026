export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { requireTrade } from '@/lib/service';
import { workspace } from '@/lib/views';

export const GET = handle((s, sess, req) => workspace(s, sess, requireTrade(s, sess, seg(req, 'trades'))));
