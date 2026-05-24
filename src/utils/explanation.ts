/**
 * Some imported solutions live in the DB as a stringified list of solution
 * parts — either as proper JSON ('["…", "…"]') or as a Python `repr`
 * (`['…', '…']` with single-quoted strings and \n / \\ escapes). Both shapes
 * occur in the olympiad dataset. This helper turns either into clean markdown
 * with each part as a "Solution N" section. Non-list strings pass through.
 */

/** Parse a Python list-of-strings literal — strings can be single- or
 *  double-quoted, with `\\`, `\'`, `\"`, `\n`, `\t`, `\r` escapes. Unknown
 *  `\X` sequences (e.g. `\ldots`, `\frac`) are preserved so LaTeX commands
 *  survive intact. Returns null if the input isn't a parseable list. */
function tryPythonList(s: string): string[] | null {
  if (!(s.startsWith('[') && s.endsWith(']'))) return null;
  const inner = s.slice(1, -1);
  const items: string[] = [];
  let i = 0;

  while (i < inner.length) {
    // Skip separators between items
    while (i < inner.length) {
      const c = inner[i];
      if (c === ' ' || c === ',' || c === '\n' || c === '\t' || c === '\r') i++;
      else break;
    }
    if (i >= inner.length) break;

    const quote = inner[i];
    if (quote !== "'" && quote !== '"') return null;
    i++;

    let buf = '';
    let closed = false;
    while (i < inner.length) {
      const c = inner[i];
      if (c === '\\' && i + 1 < inner.length) {
        const nxt = inner[i + 1];
        switch (nxt) {
          case '\\': buf += '\\'; i += 2; continue;
          case "'":  buf += "'";  i += 2; continue;
          case '"':  buf += '"';  i += 2; continue;
          case 'n':  buf += '\n'; i += 2; continue;
          case 't':  buf += '\t'; i += 2; continue;
          case 'r':  buf += '\r'; i += 2; continue;
          case '0':  buf += '\0'; i += 2; continue;
          default:
            // Unknown escape — preserve the backslash. LaTeX commands like
            // \ldots, \frac, \sqrt would otherwise lose their leading slash.
            buf += c;
            i++;
            continue;
        }
      }
      if (c === quote) {
        i++;
        closed = true;
        break;
      }
      buf += c;
      i++;
    }
    if (!closed) return null;
    items.push(buf);
  }

  return items.length > 0 ? items : null;
}

export function normaliseExplanation(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) return raw;

  let parts: string[] | null = null;

  // Try proper JSON first.
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      parts = parsed.map(p => (typeof p === 'string' ? p : JSON.stringify(p)));
    }
  } catch {
    /* fall through to Python-list parse */
  }

  // Fall back to Python list-of-strings repr.
  if (!parts) parts = tryPythonList(trimmed);

  if (!parts) return raw;
  if (parts.length === 1) return parts[0];
  return parts
    .map((p, i) => `### Solution ${i + 1}\n\n${p}`)
    .join('\n\n---\n\n');
}
