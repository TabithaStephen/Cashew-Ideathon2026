export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { decideCase } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ outcome: 'Confirm duplicate' | 'Clear, not a duplicate' | 'Ask exporter for more info'; note: string }>(req);
  return decideCase(s, sess, seg(req, 'queue'), b.outcome, b.note);
}, { roles: ['ops'] });
