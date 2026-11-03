export const dynamic = 'force-dynamic';
import { handle } from '@/lib/api';
import { verifyChain } from '@/lib/engines/registry';
import { audit } from '@/lib/store';

export const POST = handle((s, sess) => {
  const t0 = performance.now();
  const v = verifyChain(s.registry);
  audit(s, sess.role === 'ops' ? 'ops:Asha' : `${sess.role}`, 'registry.chain_verified', 'registry', { ok: v.ok, count: v.count, brokenAt: v.brokenAt });
  return { ...v, ms: Math.round(performance.now() - t0) };
}, { roles: ['lender', 'ops'] });
