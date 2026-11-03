export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { reviewField } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ docId: string; field: string }>(req);
  return reviewField(s, sess, seg(req, 'trades'), b.docId, b.field);
}, { roles: ['exporter', 'ops'] });
