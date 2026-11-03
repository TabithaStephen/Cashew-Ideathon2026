export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { advanceShipment, requireTrade } from '@/lib/service';
import { orgName } from '@/lib/store';

/** Exporter milestone confirmation (mobile "Goods delivered"). */
export const POST = handle(async (s, sess, req) => {
  const t = requireTrade(s, sess, seg(req, 'trades'));
  const b = await body<{ stage?: number }>(req);
  await advanceShipment(s, t, `exporter:${orgName(s, sess.orgId)}`, b.stage);
  return { status: t.status, shipmentStage: t.shipmentStage };
}, { roles: ['exporter'] });
