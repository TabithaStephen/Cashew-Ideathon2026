// The in-memory store (Blueprint Section 13.2), mirrored to .demo-state.json.
// It lives on globalThis because Next.js can load this module more than once in a single server.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSeed } from '@/lib/seed/scenarios';
import type { DemoState, ScenarioId } from '@/lib/types';

const MIRROR = path.join(process.cwd(), '.demo-state.json');
const useMirror = () => !process.env.VITEST && process.env.NEXT_PHASE !== 'phase-production-build';

interface Holder {
  state?: DemoState;
  timer?: ReturnType<typeof setTimeout>;
  mirrorMtime?: number;
}
const holder: Holder = ((globalThis as unknown as { __cashew?: Holder }).__cashew ??= {});

function writeMirror() {
  if (!holder.state || !useMirror()) return;
  try {
    writeFileSync(MIRROR, JSON.stringify(holder.state, null, 1));
    holder.mirrorMtime = statSync(MIRROR).mtimeMs;
  } catch {
    // The demo keeps running from memory if the mirror can't be written.
  }
}

function readMirror(): DemoState | undefined {
  try {
    const parsed = JSON.parse(readFileSync(MIRROR, 'utf8')) as DemoState;
    holder.mirrorMtime = statSync(MIRROR).mtimeMs;
    return parsed.version === 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The current state. Picks up a hand edit of the mirror, which is how the Verify chain rehearsal works (14.2). */
export function db(): DemoState {
  if (useMirror() && existsSync(MIRROR)) {
    const edited = holder.mirrorMtime === undefined || statSync(MIRROR).mtimeMs > holder.mirrorMtime;
    if (edited && !holder.timer) holder.state = readMirror() ?? holder.state;
  }
  if (!holder.state) {
    holder.state = buildSeed('B');
    save();
  }
  return holder.state;
}

export function save(): void {
  if (!useMirror() || holder.timer) return;
  holder.timer = setTimeout(() => {
    holder.timer = undefined;
    writeMirror();
  }, 200);
}

export function reset(scenario?: ScenarioId): DemoState {
  const previous = holder.state;
  const next = buildSeed(scenario ?? previous?.scenario ?? 'B');
  if (previous) {
    next.speed = previous.speed;
    next.stagedLabels = previous.stagedLabels;
    next.resetCount = previous.resetCount + 1;
  }
  holder.state = next;
  save();
  return next;
}
