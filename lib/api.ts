// Route-handler helpers: session cookie, error shape, store lock + tick.
import { NextResponse, type NextRequest } from 'next/server';
import { withStore } from './store';
import { ApiError, tick } from './service';
import type { DemoState, Role, Session } from './types';

export const SESSION_COOKIE = 'cashew_session';

export function parseSession(raw: string | undefined | null): Session | null {
  if (!raw) return null;
  const [role, orgId] = decodeURIComponent(raw).split(':');
  if (!['exporter', 'lender', 'ops'].includes(role) || !orgId) return null;
  return { role: role as Role, orgId };
}
export const sessionOf = (req: NextRequest) => parseSession(req.cookies.get(SESSION_COOKIE)?.value);

export const errorJson = (status: number, code: string, message: string, soft = false) =>
  NextResponse.json({ error: { code, message, status } }, { status: soft ? 200 : status, headers: soft ? { 'x-cashew-status': String(status) } : undefined });

type Handler<T> = (s: DemoState, sess: Session, req: NextRequest) => Promise<T> | T;

/** Wrap a handler: require a session (unless `open`), run inside the store lock after a tick. */
export function handle<T>(fn: Handler<T>, opts: { open?: boolean; roles?: Role[] } = {}) {
  return async (req: NextRequest) => {
    const sess = sessionOf(req);
    // Background polls ask for "soft" errors so a role switch or reset never spams the console with 4xx lines.
    const soft = req.method === 'GET' && req.headers.get('x-cashew-soft') === '1';
    if (!sess && !opts.open) return errorJson(401, 'SESSION_REQUIRED', 'Pick a role on the landing page first.', soft);
    if (sess && opts.roles && !opts.roles.includes(sess.role)) return errorJson(403, 'FORBIDDEN', `This endpoint is for ${opts.roles.join(' or ')} only.`, soft);
    try {
      const out = await withStore(async (s) => { await tick(s); return fn(s, sess as Session, req); });
      if (out instanceof NextResponse) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return errorJson(e.status, e.code, e.message, soft);
      console.error(e);
      return errorJson(500, 'INTERNAL', (e as Error).message);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}
/** Extract a dynamic segment from the URL path (route handlers get params separately; this keeps handle() simple). */
export const seg = (req: NextRequest, after: string) => {
  const parts = req.nextUrl.pathname.split('/');
  const i = parts.indexOf(after);
  return decodeURIComponent(parts[i + 1] ?? '');
};
