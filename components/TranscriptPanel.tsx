import React, { forwardRef } from 'react';
import TranscriptList from './TranscriptList';

interface TranscriptPanelProps {
  transcript: string | any;
}

export const TranscriptPanel = forwardRef<HTMLDivElement, TranscriptPanelProps>(({ transcript }, ref) => {
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