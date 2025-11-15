import React from 'react';

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes, onNotesChange }) => {
  return (
    <div className="h-full">
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Start typing your notes here... They will be saved automatically."
        className="w-full h-full p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-600 dark:text-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  );
};