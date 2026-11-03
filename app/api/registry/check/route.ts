export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { ApiError, registryIdentityFor, requireTrade } from '@/lib/service';
import { checkRegistry } from '@/lib/engines/registry';
import { audit, orgName } from '@/lib/store';

/** Returns only the result code (and a similarity breakdown for POSSIBLE_DUPLICATE). Never another lender's identity. */
export const POST = handle(async (s, sess, req) => {
  const b = await body<{ tradeId: string }>(req);
  const t = requireTrade(s, sess, b.tradeId);
  const id = registryIdentityFor(s, t);
  if (!id) throw new ApiError(409, 'NO_INVOICE', 'No invoice on file.');
  const r = checkRegistry(s.registry, s.registryIndex, id, sess.role === 'lender' ? sess.orgId : undefined);
  audit(s, sess.role === 'ops' ? 'ops:Asha' : `${sess.role}:${orgName(s, sess.orgId)}`, 'registry.checked', t.id, { result: r.result });
  return { result: r.result, fingerprint: r.fingerprint, matchedFingerprint: r.matchedFingerprint, similarity: r.result === 'POSSIBLE_DUPLICATE' ? r.similarity : undefined };
});
