import React, { forwardRef } from 'react';
import TranscriptList from './TranscriptList';

interface TranscriptPanelProps {
  transcript: string | any;
  onSeekTo?: (seconds: number) => void;
}

// ── Timestamped transcript helpers ──────────────────────────────────────────

interface TranscriptSegment {
  startSeconds: number;
  text: string;
}

const parseTimestampedTranscript = (text: string): TranscriptSegment[] => {
  const regex = /\[(\d{2}):(\d{2})(?::(\d{2}))?\]\s*([^\[]+)/g;
  const segments: TranscriptSegment[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const hasSecs = match[3] !== undefined;
    const h = hasSecs ? parseInt(match[1]) : 0;
    const m = hasSecs ? parseInt(match[2]) : parseInt(match[1]);
    const s = hasSecs ? parseInt(match[3]) : parseInt(match[2]);
    segments.push({ startSeconds: h * 3600 + m * 60 + s, text: match[4].trim() });
  }
  return segments;
};

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────

export const TranscriptPanel = forwardRef<HTMLDivElement, TranscriptPanelProps>(({ transcript, onSeekTo }, ref) => {
  // Detect if transcript is a JSON object (events array, wireMagic, etc.) or plain string
  let isJsonObject = false;
  let parsedData: any = null;

  if (typeof transcript === 'string') {
    try {
      const parsed = JSON.parse(transcript);
      // Check if it has the structure of our API response (events or transcript field)
      if (parsed && (Array.isArray(parsed.events) || typeof parsed.transcript === 'string')) {
        isJsonObject = true;
        parsedData = parsed;
      }
    } catch (e) {
      // Not JSON, treat as plain text
      isJsonObject = false;
    }
  } else if (typeof transcript === 'object' && transcript !== null) {
    // Already parsed object
    if (Array.isArray(transcript.events) || typeof transcript.transcript === 'string') {
      isJsonObject = true;
      parsedData = transcript;
    }
  }

  // Use TranscriptList for formatted JSON, plain text for strings
  if (isJsonObject && parsedData) {
    return (
      <div ref={ref} className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm leading-relaxed custom-scrollbar">
        <TranscriptList rawTranscript={parsedData} />
      </div>
    );
  }

  // Try to parse timestamped segments from plain-text transcript
  const segments = typeof transcript === 'string' ? parseTimestampedTranscript(transcript) : [];

  if (segments.length > 0) {
    return (
      <div
        ref={ref}
        className="h-full overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 custom-scrollbar space-y-0.5"
      >
        {segments.map((seg, idx) => (
          <div
            key={idx}
            onClick={() => onSeekTo?.(seg.startSeconds)}
            className={`flex gap-2 p-2 rounded-lg transition-colors group ${
              onSeekTo
                ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700'
                : 'cursor-default'
            }`}
          >
            <span className="text-xs font-mono text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5 group-hover:text-blue-600 min-w-[2.75rem] text-right">
              {formatTime(seg.startSeconds)}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {seg.text}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: render as plain text
  return (
    <div
      ref={ref}
      className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap custom-scrollbar"
    >
      {transcript}
    </div>
  );
});

TranscriptPanel.displayName = 'TranscriptPanel';