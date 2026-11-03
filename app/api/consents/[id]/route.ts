export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { revokeConsent } from '@/lib/service';

export const DELETE = handle((s, sess, req) => revokeConsent(s, sess, seg(req, 'consents')), { roles: ['exporter', 'ops'] });
