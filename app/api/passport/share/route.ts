export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { ApiError, grantConsent } from '@/lib/service';

export const POST = handle(async (s, sess, req) => {
  const b = await body<{ recipientOrgId?: string; purpose?: string; days?: number }>(req);
  const recipient = s.orgs.find((o) => o.id === b.recipientOrgId && o.type === 'lender');
  if (!recipient) throw new ApiError(400, 'BAD_REQUEST', 'Pick a lender to share with.');
  const c = grantConsent(s, sess, { scope: 'passport', recipientOrgId: recipient.id, recipientLabel: recipient.shortName, purpose: b.purpose || 'Credit assessment', days: b.days ?? 30 });
  return { consent: c, link: `/api/passport/${sess.orgId}?consent=${c.id}` };
}, { roles: ['exporter'] });
