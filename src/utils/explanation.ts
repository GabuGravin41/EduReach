/**
 * Some imported solutions (multi-method proofs from olympiad datasets) live in
 * the DB as a JSON-stringified array of solution parts — e.g.
 *   '["Method 1: …", "Method 2: …", "Method 3: …"]'
 *
 * When that raw string is fed to a markdown/math renderer, the user sees the
 * brackets, quotes, and double-escaped backslashes as text. This helper turns
 * such payloads into clean markdown with each method as a "Solution N" section
 * separated by horizontal rules. Non-JSON strings pass through untouched.
 */
export function normaliseExplanation(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return raw;
    const parts = parsed.map(p =>
      typeof p === 'string' ? p : JSON.stringify(p));
    if (parts.length === 1) return parts[0];
    return parts
      .map((p, i) => `### Solution ${i + 1}\n\n${p}`)
      .join('\n\n---\n\n');
  } catch {
    return raw;
  }
}
