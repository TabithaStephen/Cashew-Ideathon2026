export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { ApiError, grantConsent, requireTrade } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ scope: string; recipientOrgId: string; recipientLabel?: string; purpose: string; days?: number }>(req);
  if (!b.scope || !b.recipientOrgId || !b.purpose) throw new ApiError(400, 'BAD_REQUEST', 'scope, recipientOrgId and purpose are required.');
  if (b.scope.startsWith('trade:')) requireTrade(s, sess, b.scope.slice(6));
  return grantConsent(s, sess, b);
}, { roles: ['exporter'] });
