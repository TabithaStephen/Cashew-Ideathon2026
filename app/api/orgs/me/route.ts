export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { SCENARIO_EXPORTER } from '@/lib/seed/scenarios';

export const GET = handle((s, sess) => ({
  session: sess,
  org: s.orgs.find((o) => o.id === sess?.orgId) ?? null,
  scenario: s.scenario, speed: s.speed, epoch: s.epoch, clockOffsetMs: s.clockOffsetMs,
  scenarioExporter: SCENARIO_EXPORTER[s.scenario],
  orgs: s.orgs.map((o) => ({ id: o.id, type: o.type, shortName: o.shortName, legalName: o.legalName, kind: o.kind })),
}), { open: true });
