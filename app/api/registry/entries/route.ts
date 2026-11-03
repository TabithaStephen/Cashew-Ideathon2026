export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { registryView } from '@/lib/views';
import { verifyChain } from '@/lib/engines/registry';

export const GET = handle((s, sess) => {
  const entries = registryView(s, sess);
  return { entries, count: s.registry.length, head: s.registry.at(-1)?.entryHash ?? null, lastAnchoredAt: s.lastAnchoredAt, anchoredHead: (s as unknown as { anchoredHead?: string }).anchoredHead ?? null, chainOk: verifyChain(s.registry).ok };
}, { roles: ['lender', 'ops'] });
