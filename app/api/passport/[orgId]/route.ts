export const dynamic = 'force-dynamic';
import { handle, seg } from '@/lib/api';
import { ApiError } from '@/lib/service';
import { issuePassport } from '@/lib/engines/passport';
import { nowMs, orgName } from '@/lib/store';

export const GET = handle((s, sess, req) => {
  const orgId = seg(req, 'passport');
  const org = s.orgs.find((o) => o.id === orgId && o.type === 'sme');
  if (!org) throw new ApiError(404, 'NOT_FOUND', 'No Passport for that organisation.');
  const consentId = req.nextUrl.searchParams.get('consent');
  const now = nowMs(s);
  const shares = s.consents.filter((c) => c.orgId === orgId && c.scope === 'passport');
  const consent = consentId ? shares.find((c) => c.id === consentId) : undefined;
  if (sess.role === 'exporter' && sess.orgId !== orgId) throw new ApiError(403, 'FORBIDDEN', 'You can only view your own Passport.');
  if (sess.role === 'lender') {
    const ok = shares.some((c) => c.recipientOrgId === sess.orgId && !c.revokedAt && new Date(c.expiresAt).getTime() > now);
    if (!ok) throw new ApiError(403, 'CONSENT_REQUIRED', 'The exporter has not shared their Passport with you.');
  }
  const c = consent ?? [...shares].reverse().find((x) => !x.revokedAt && new Date(x.expiresAt).getTime() > now);
  const credential = issuePassport(org, s.trades, new Date(now), c ? { recipient: c.recipientLabel ?? orgName(s, c.recipientOrgId), purpose: c.purpose, expiry: c.expiresAt.slice(0, 10) } : undefined);
  const history = s.trades.filter((t) => t.smeId === orgId && ['REPAID', 'CLOSED'].includes(t.status)).map((t) => ({ id: t.id, invoiceNo: t.invoiceNo, value: t.value, repaidAt: t.repaidAt, buyer: s.buyers.find((b) => b.id === t.buyerId)?.name }));
  return { credential, shares: sess.role === 'exporter' || sess.role === 'ops' ? shares : [], history };
}, { roles: ['exporter', 'lender', 'ops'] });
