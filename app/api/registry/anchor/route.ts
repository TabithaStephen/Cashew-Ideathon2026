export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { audit, nowIso } from '@/lib/store';

/** STAGED: pretend to publish the chain head to an external anchor. */
export const POST = handle((s) => {
  const head = s.registry.at(-1)?.entryHash ?? '';
  s.lastAnchoredAt = nowIso(s);
  (s as unknown as { anchoredHead?: string }).anchoredHead = head;
  audit(s, 'system', 'registry.anchored', 'registry', { head, simulated: true });
  return { head, anchoredAt: s.lastAnchoredAt, simulated: true, anchor: 'External timestamping service (simulated)' };
}, { roles: ['lender', 'ops'] });
