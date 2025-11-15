import React from 'react';

interface TranscriptPanelProps {
  transcript: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript }) => {
  return (
    <div className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
        {transcript}
    </div>
  );
};