export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { focusTrade } from '@/lib/service';

export const GET = handle((s) => {
  const t = focusTrade(s);
  return { scenario: s.scenario, speed: s.speed, epoch: s.epoch, clockOffsetMs: s.clockOffsetMs, focusTradeId: t?.id ?? null, focusStatus: t?.status ?? null, registryCount: s.registry.length };
}, { open: true });
