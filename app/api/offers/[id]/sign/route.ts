export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { signOffer } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ otp: string }>(req);
  const r = signOffer(s, sess, seg(req, 'offers'), String(b.otp ?? ''));
  return { status: r.trade.status, committed: r.committed, registryBlock: r.trade.registryBlock ?? null, disbursalDueAt: r.trade.disbursalDueAt ?? null };
}, { roles: ['exporter'] });
