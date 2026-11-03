export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { createTrade } from '@/lib/service';
import { listTrades, tradeRow } from '@/lib/views';

export const GET = handle((s, sess) => listTrades(s, sess));
export const POST = handle(async (s, sess, req) => tradeRow(s, sess, createTrade(s, sess, await body(req))));
