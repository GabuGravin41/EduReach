import React, { useState } from 'react';
import { useNotesDownload } from '../src/hooks/useNotesDownload';
import { DownloadIcon } from './icons/DownloadIcon';

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  courseName?: string;
  lessonName?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ 
  notes, 
  onNotesChange,
  courseName = 'Course',
  lessonName = 'Lesson'
}) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { downloadAsText, downloadAsMarkdown, downloadAsPDF, isDownloading } = useNotesDownload();

  const handleNotesChange = (value: string) => {
    onNotesChange(value);
    // Could implement auto-save to backend here
  };

  const handleDownload = async (format: 'txt' | 'md' | 'pdf') => {
    if (!notes.trim()) {
      alert('No notes to download');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `notes-${lessonName}-${timestamp}`;

    if (format === 'txt') {
      downloadAsText(notes, `${baseFilename}.txt`);
    } else if (format === 'md') {
      downloadAsMarkdown(notes, `${baseFilename}.md`, { courseName, lessonName });
    } else if (format === 'pdf') {
      await downloadAsPDF(notes, `${baseFilename}.pdf`, { courseName, lessonName });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Download Options */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notes</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('txt')}
            disabled={!notes.trim() || isDownloading}
            className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as text file"
          >
            TXT
          </button>
          <button
            onClick={() => handleDownload('md')}
            disabled={!notes.trim() || isDownloading}
            className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as markdown"
          >
            MD
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={!notes.trim() || isDownloading}
            className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="Download as PDF"
          >
            <DownloadIcon className="w-3 h-3" />
            PDF
          </button>
        </div>
      </div>

      {/* Notes Textarea */}
      <textarea
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="Start typing your notes here... You can download them later in multiple formats."
        className="flex-1 p-4 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />

      {/* Character Count */}
      {notes.trim().length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          {notes.length} characters
        </div>
      )}
    </div>
  );
};