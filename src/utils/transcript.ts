export type RawEvent = { tStartMs: number; dDurationMs: number; segs?: Array<{ utf8?: string }> };
export type Segment = { startMs: number; endMs: number; text: string };

function pad(num: number, size = 2) {
  return String(num).padStart(size, '0');
}

export function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${mm}:${pad(ss)}`;
}

export function normalizeEvents(events: RawEvent[]): Segment[] {
  if (!Array.isArray(events)) return [];
  const segs: Segment[] = [];
  for (const ev of events) {
    const text = (ev.segs || []).map(s => s.utf8 || '').join(' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const start = ev.tStartMs || 0;
    const end = start + (ev.dDurationMs || 0);
    segs.push({ startMs: start, endMs: end, text });
  }
  return mergeAdjacentSegments(segs, 1000);
}

export function mergeAdjacentSegments(segs: Segment[], maxGapMs = 1000): Segment[] {
  if (!segs || segs.length === 0) return [];
  segs.sort((a, b) => a.startMs - b.startMs);
  const out: Segment[] = [{ ...segs[0] }];
  for (let i = 1; i < segs.length; i++) {
    const last = out[out.length - 1];
    const cur = segs[i];
    if (cur.startMs - last.endMs <= maxGapMs && (last.text.length + cur.text.length) < 1000) {
      last.endMs = Math.max(last.endMs, cur.endMs);
      last.text = (last.text + ' ' + cur.text).replace(/\s+/g, ' ').trim();
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

export function cleanText(s: string): string {
  if (!s) return '';
  return s
    .replace(/\[(music|applause|laughter|cheering)[^\]]*\]/gi, '')
    .replace(/\((music|applause|laughs|crosstalk)[^\)]*\)/gi, '')
    .replace(/\b(uh|um|ah|you know|like)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function chunkSegments(segments: Segment[], maxChars = 3000, overlapChars = 400) {
  const chunks: { startMs: number; endMs: number; text: string }[] = [];
  let buffer = '';
  let bufferStart = segments.length ? segments[0].startMs : 0;
  let bufferEnd = bufferStart;

  for (const s of segments) {
    const t = cleanText(s.text);
    if (!t) continue;
    if (!buffer) bufferStart = s.startMs;
    if ((buffer.length + 1 + t.length) > maxChars) {
      bufferEnd = s.endMs;
      chunks.push({ startMs: bufferStart, endMs: bufferEnd, text: buffer.trim() });
      const overlap = buffer.slice(-overlapChars);
      buffer = (overlap + ' ' + t).trim();
      bufferStart = s.startMs;
      bufferEnd = s.endMs;
    } else {
      buffer += (buffer ? ' ' : '') + t;
      bufferEnd = s.endMs;
    }
  }

  if (buffer.trim()) chunks.push({ startMs: bufferStart, endMs: bufferEnd, text: buffer.trim() });
  return chunks;
}

export function processRawTranscript(raw: any, maxChars = 3000, overlapChars = 400) {
  // raw may be: string, object with events, or object with segments
  if (!raw) return { segments: [], chunks: [] };
  if (typeof raw === 'string') {
    const text = cleanText(raw);
    return { segments: [{ startMs: 0, endMs: 0, text }], chunks: [{ startMs: 0, endMs: 0, text }] };
  }
  if (Array.isArray(raw.events)) {
    const segs = normalizeEvents(raw.events);
    const chunks = chunkSegments(segs, maxChars, overlapChars);
    return { segments: segs, chunks };
  }
  if (Array.isArray(raw.segments) || Array.isArray(raw.segs)) {
    // try to map to Segment[]
    const list = raw.segments || raw.segs || [];
    const segs: Segment[] = list.map((it: any) => ({ startMs: it.startMs || it.tStartMs || 0, endMs: it.endMs || (it.startMs || it.tStartMs || 0) + (it.durationMs || it.dDurationMs || 0), text: (it.text || (it.utf8 || '')).replace(/\s+/g,' ').trim() }));
    const merged = mergeAdjacentSegments(segs, 1000);
    const chunks = chunkSegments(merged, maxChars, overlapChars);
    return { segments: merged, chunks };
  }

  // unknown structure - try to extract transcript string
  if (raw.transcript && typeof raw.transcript === 'string') {
    const text = cleanText(raw.transcript);
    return { segments: [{ startMs: 0, endMs: 0, text }], chunks: [{ startMs: 0, endMs: 0, text }] };
  }

  return { segments: [], chunks: [] };
}

/**
 * Format segments into readable paragraphs.
 * Groups segments when gap between them is <= gapThresholdMs.
 */
export function formatSegmentsToParagraphs(segments: Segment[], gapThresholdMs = 1600) {
  if (!segments || segments.length === 0) return [];
  const paras: { startMs: number; endMs: number; text: string }[] = [];
  let curText = '';
  let curStart = segments[0].startMs;
  let curEnd = segments[0].endMs;

  const pushCur = () => {
    if (curText.trim()) {
      // Normalize spacing and sentence breaks
      const text = curText.replace(/\s+/g, ' ').trim();
      // Capitalize first character of paragraph
      const cap = text.charAt(0).toUpperCase() + text.slice(1);
      paras.push({ startMs: curStart, endMs: curEnd, text: cap });
    }
    curText = '';
  };

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!curText) {
      curStart = s.startMs;
      curEnd = s.endMs;
      curText = s.text;
      continue;
    }
    const gap = s.startMs - curEnd;
    if (gap > gapThresholdMs) {
      // new paragraph
      pushCur();
      curStart = s.startMs;
      curEnd = s.endMs;
      curText = s.text;
    } else {
      // continue paragraph
      curText = (curText + ' ' + s.text).trim();
      curEnd = Math.max(curEnd, s.endMs);
    }
  }

  pushCur();
  return paras;
}

export default {
  fmtMs,
  normalizeEvents,
  mergeAdjacentSegments,
  cleanText,
  chunkSegments,
  processRawTranscript
  ,formatSegmentsToParagraphs
};
