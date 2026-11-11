import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const tokens = readFileSync(path.join(root, 'app/tokens.css'), 'utf8');

// Manifest identity, which replaces Blueprint Section 5.2.
const spec: Record<string, string> = {
  paper: '#F4F2EA',
  sheet: '#FFFFFF',
  ink: '#15181A',
  'ink-2': '#4A4F52',
  'ink-3': '#62676A',
  rule: '#D8D4C6',
  accent: '#F5C400',
  'accent-press': '#DDB000',
  pass: '#1B6B45',
  'pass-soft': '#E4F1E8',
  fail: '#B3261E',
  'fail-soft': '#FBE6E3',
  warn: '#A34E00',
  'warn-soft': '#FAEBDA',
  unknown: '#46586F',
  'unknown-soft': '#E7EBF0',
  pending: '#5E5A4E',
  'pending-soft': '#EDEAE0',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(name) ? [full] : [];
  });
}

describe('design tokens', () => {
  it.each(Object.entries(spec))('--%s is %s', (name, hex) => {
    expect(tokens.toLowerCase()).toContain(`--${name}: ${hex.toLowerCase()};`);
  });

  it('has no hard-coded hex colours outside the token file', () => {
    const files = ['app', 'components', 'lib'].flatMap((d) => sourceFiles(path.join(root, d)));
    const offenders = files.filter(
      (f) => !f.endsWith('app/tokens.css') && /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
