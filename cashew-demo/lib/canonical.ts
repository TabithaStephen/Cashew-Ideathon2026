// Canonical JSON: keys sorted at every level, so the same data always hashes and signs identically.
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  const object = value as Record<string, unknown>;
  const parts = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJSON(object[key])}`);
  return `{${parts.join(',')}}`;
}
