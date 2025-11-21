import React, { forwardRef } from 'react';

interface TranscriptPanelProps {
  transcript: string;
}

export const TranscriptPanel = forwardRef<HTMLDivElement, TranscriptPanelProps>(({ transcript }, ref) => {
  return (
    <div
      ref={ref}
      className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap"
    >
        {transcript}
    </div>
  );
});

TranscriptPanel.displayName = 'TranscriptPanel';