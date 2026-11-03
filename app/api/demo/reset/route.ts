export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/api';
import { getState, withStore } from '@/lib/store';
import { resetScenario } from '@/lib/demo/controls';
import { SCENARIO_EXPORTER } from '@/lib/seed/scenarios';

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  const scenario = getState().scenario;
  const prev = JSON.parse(JSON.stringify(getState()));
  const s = await withStore(() => resetScenario(prev, scenario));
  const res = NextResponse.json({ scenario: s.scenario, ms: Math.round(performance.now() - t0), epoch: s.epoch });
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (raw && decodeURIComponent(raw).startsWith('exporter:')) res.cookies.set(SESSION_COOKIE, `exporter:${SCENARIO_EXPORTER[scenario]}`, { path: '/', sameSite: 'lax' });
  return res;
}
