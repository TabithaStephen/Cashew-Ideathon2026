export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
export const GET = handle((s, sess) => s.products.filter((p) => sess.role === 'ops' || p.lenderId === sess.orgId), { roles: ['lender', 'ops'] });
