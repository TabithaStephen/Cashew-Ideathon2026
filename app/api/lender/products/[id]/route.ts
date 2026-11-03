export const dynamic = 'force-dynamic';
import { body, handle, seg } from '@/lib/api';
import { ApiError } from '@/lib/service';
import { audit, orgName } from '@/lib/store';
import type { LenderProduct } from '@/lib/types';

export const PATCH = handle(async (s, sess, req) => {
  const p = s.products.find((x) => x.id === seg(req, 'products'));
  if (!p || p.lenderId !== sess.orgId) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
  const b = await body<Partial<LenderProduct>>(req);
  const allowed: (keyof LenderProduct)[] = ['minTicket', 'maxTicket', 'maxTenureDays', 'minStrength', 'active', 'sectors', 'corridors', 'requiredDocs', 'name'];
  const changes: Record<string, unknown> = {};
  for (const k of allowed) if (k in b) { (p as unknown as Record<string, unknown>)[k] = b[k]; changes[k] = b[k]; }
  audit(s, `lender:${orgName(s, sess.orgId)}`, 'product.updated', p.id, changes);
  return p;
}, { roles: ['lender'] });
