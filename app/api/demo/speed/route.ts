export const dynamic = 'force-dynamic';
import { body, handle } from '@/lib/api';
import { ApiError } from '@/lib/service';
import { audit } from '@/lib/store';

export const POST = handle(async (s, _sess, req) => {
  const b = await body<{ factor: number }>(req);
  const f = Number(b.factor);
  if (![0, 0.5, 1, 2].includes(f)) throw new ApiError(400, 'BAD_REQUEST', 'factor must be 0 (Instant), 0.5, 1 or 2.');
  s.speed = f;
  audit(s, 'demo', 'demo.speed', '-', { factor: f });
  return { speed: f };
}, { open: true });
