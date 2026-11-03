// In-memory store (Blueprint 13.2): module-level state seeded at boot, mirrored to .demo-state.json.
import fs from 'node:fs';
import path from 'node:path';
import type { AuditEvent, DemoState, Notification, Role, ScenarioId, Trade, WebhookEvent } from './types';
import { buildSeed } from './seed';

export const STATE_VERSION = 3;
const MIRROR = path.join(process.cwd(), '.demo-state.json');
const mirrorEnabled = () => process.env.CASHEW_NO_MIRROR !== '1';

interface Holder { state: DemoState; lastWriteMtime: number; timer?: ReturnType<typeof setTimeout>; lock: Promise<unknown>; }
const g = globalThis as unknown as { __cashew?: Holder };

function load(): DemoState {
  if (mirrorEnabled() && fs.existsSync(MIRROR)) {
    try {
      const s = JSON.parse(fs.readFileSync(MIRROR, 'utf8')) as DemoState;
      if (s.version === STATE_VERSION) return s;
    } catch { /* fall through to seed */ }
  }
  return buildSeed('B');
}

function holder(): Holder {
  if (!g.__cashew) {
    g.__cashew = { state: load(), lastWriteMtime: 0, lock: Promise.resolve() };
    if (mirrorEnabled() && fs.existsSync(MIRROR)) g.__cashew.lastWriteMtime = fs.statSync(MIRROR).mtimeMs;
  }
  return g.__cashew;
}

/** If the mirror was edited by hand (e.g. rehearsing a tampered registry), pick up the edit. */
function syncFromMirror(h: Holder) {
  if (!mirrorEnabled() || !fs.existsSync(MIRROR)) return;
  const m = fs.statSync(MIRROR).mtimeMs;
  if (h.timer || m <= h.lastWriteMtime + 1) return;
  try {
    const s = JSON.parse(fs.readFileSync(MIRROR, 'utf8')) as DemoState;
    if (s.version === STATE_VERSION) h.state = s;
  } catch { /* ignore partial edits */ }
  h.lastWriteMtime = m;
}

export function getState(): DemoState {
  const h = holder();
  syncFromMirror(h);
  return h.state;
}

export function persist() {
  if (!mirrorEnabled()) return;
  const h = holder();
  if (h.timer) clearTimeout(h.timer);
  h.timer = setTimeout(() => {
    h.timer = undefined;
    try {
      fs.writeFileSync(MIRROR, JSON.stringify(h.state));
      h.lastWriteMtime = fs.statSync(MIRROR).mtimeMs;
    } catch { /* read-only FS: keep in memory */ }
  }, 200);
}

/** Serialise all mutations so async ticks never interleave. */
export async function withStore<T>(fn: (s: DemoState) => Promise<T> | T): Promise<T> {
  const h = holder();
  const run = h.lock.then(() => fn(getState()));
  h.lock = run.catch(() => undefined);
  const out = await run;
  persist();
  return out;
}

export function reset(scenario: ScenarioId = 'B', keepSpeed = true): DemoState {
  const h = holder();
  const speed = keepSpeed ? h.state?.speed ?? 1 : 1;
  h.state = buildSeed(scenario);
  h.state.speed = speed;
  persist();
  return h.state;
}
/** Test helper: replace the state wholesale. */
export function _setState(s: DemoState) { holder().state = s; }

// ---------- helpers that write to the state ----------
export const nowMs = (s: DemoState) => Date.now() + s.clockOffsetMs;
export const nowIso = (s: DemoState) => new Date(nowMs(s)).toISOString();
export const nextId = (s: DemoState, prefix: string) => `${prefix}_${(++s.seq).toString(36).padStart(4, '0')}`;

export function audit(s: DemoState, actor: string, action: string, object: string, meta?: unknown): AuditEvent {
  const e: AuditEvent = { id: nextId(s, 'evt'), actor, action, object, timestamp: nowIso(s), ...(meta === undefined ? {} : { meta }) };
  s.audit.push(e);
  return e;
}

export function notify(s: DemoState, n: Omit<Notification, 'id' | 'createdAt'>) {
  const id = (s.notifications.at(-1)?.id ?? 0) + 1;
  s.notifications.push({ ...n, id, createdAt: nowIso(s) });
  if (s.notifications.length > 200) s.notifications.splice(0, s.notifications.length - 200);
}

/** In-process webhook events (Technical Master): feed notifications and the audit log. */
export function emit(s: DemoState, type: string, tradeId?: string, payload?: unknown) {
  const e: WebhookEvent = { id: nextId(s, 'whk'), type, tradeId, at: nowIso(s), payload };
  s.webhooks.push(e);
  audit(s, 'system', `webhook.${type}`, tradeId ?? '-', payload);
}

export const findTrade = (s: DemoState, id: string): Trade | undefined => s.trades.find((t) => t.id === id);
export const orgName = (s: DemoState, id: string) => s.orgs.find((o) => o.id === id)?.shortName ?? id;
export const roleAudience = (role: Role, orgId?: string) => ({ role, orgId });
