export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, body, errorJson } from '@/lib/api';
import { getState, withStore } from '@/lib/store';
import { resetScenario } from '@/lib/demo/controls';
import { SCENARIO_EXPORTER } from '@/lib/seed/scenarios';
import type { ScenarioId } from '@/lib/types';

export async function POST(req: NextRequest) {
  const b = await body<{ id: ScenarioId }>(req);
  if (!['A', 'B', 'C'].includes(b.id)) return errorJson(400, 'BAD_REQUEST', 'id must be A, B or C.');
  const t0 = performance.now();
  const prev = JSON.parse(JSON.stringify(getState()));
  const s = await withStore(() => resetScenario(prev, b.id));
  const res = NextResponse.json({ scenario: s.scenario, ms: Math.round(performance.now() - t0), epoch: s.epoch });
  // Keep the presenter in the same role; exporters follow the scenario's exporter.
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (raw && decodeURIComponent(raw).startsWith('exporter:')) res.cookies.set(SESSION_COOKIE, `exporter:${SCENARIO_EXPORTER[b.id]}`, { path: '/', sameSite: 'lax' });
  return res;
}
