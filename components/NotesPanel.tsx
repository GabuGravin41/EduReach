
import React, { useEffect, useState } from 'react';

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  courseName?: string;
  lessonName?: string;
  videoId?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ 
  notes, 
  onNotesChange,
  videoId,
}) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Logic to simulate "Saving..." UI state based on prop updates
  useEffect(() => {
    if (!videoId || !notes.trim()) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
        setSaveStatus('saved');
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, videoId]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center sm:justify-between bg-slate-50 dark:bg-slate-800">
        <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">My Notes</h3>
        {videoId && (
          <span className={`text-xs font-medium transition-colors duration-300 ${
            saveStatus === 'saved' ? 'text-emerald-500' :
            saveStatus === 'saving' ? 'text-blue-500' : 'text-slate-400'
          }`}>
            {saveStatus === 'saving' ? 'Saving...' :
             saveStatus === 'saved' ? 'Saved to Cloud' : ''}
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Start typing your notes here... They auto-save."
        className="flex-1 p-4 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 resize-none w-full"
      />
    </div>
  );
};
