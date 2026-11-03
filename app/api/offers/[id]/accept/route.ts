export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { acceptOffer } from '@/lib/service';

export const POST = handle((s, sess, req) => acceptOffer(s, sess, seg(req, 'offers')), { roles: ['exporter'] });
