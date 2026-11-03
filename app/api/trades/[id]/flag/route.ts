export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { flagChecks } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ checkIds: number[] }>(req);
  const t = flagChecks(s, sess, seg(req, 'trades'), (b.checkIds ?? []).map(Number));
  return { flagged: t.flaggedUnknownOrFailed };
}, { roles: ['exporter'] });
