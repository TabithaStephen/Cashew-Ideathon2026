export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { orgName } from '@/lib/store';

export const GET = handle((s) => s.opsQueue.map((c) => {
  const t = s.trades.find((x) => x.id === c.tradeId);
  return { ...c, exporter: t ? orgName(s, t.smeId) : '', invoiceNo: t?.invoiceNo, tradeStatus: t?.status };
}).reverse(), { roles: ['ops'] });
