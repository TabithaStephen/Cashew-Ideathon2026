export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, body, errorJson } from '@/lib/api';
import { getState } from '@/lib/store';
import { SCENARIO_EXPORTER } from '@/lib/seed/scenarios';

export async function POST(req: NextRequest) {
  const b = await body<{ role?: string; orgId?: string }>(req);
  const s = getState();
  const role = b.role;
  if (!role || !['exporter', 'lender', 'ops'].includes(role)) return errorJson(400, 'BAD_REQUEST', 'role must be exporter, lender or ops.');
  const orgId = b.orgId ?? (role === 'exporter' ? SCENARIO_EXPORTER[s.scenario] : role === 'lender' ? 'lender_banyan' : 'org_cashew');
  const org = s.orgs.find((o) => o.id === orgId);
  const okType = role === 'exporter' ? org?.type === 'sme' : role === 'lender' ? org?.type === 'lender' : org?.type === 'platform';
  if (!okType) return errorJson(400, 'BAD_REQUEST', 'That organisation does not match the role.');
  const res = NextResponse.json({ role, orgId });
  res.cookies.set(SESSION_COOKIE, `${role}:${orgId}`, { path: '/', sameSite: 'lax', httpOnly: false });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
