import React, { useEffect, useRef, useState } from 'react';
import { useNotesDownload } from '../src/hooks/useNotesDownload';
import { DownloadIcon } from './icons/DownloadIcon';
import apiClient from '../src/services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  courseName?: string;
  lessonName?: string;
  videoId?: string;
  lessonId?: number;
  onAutoSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  onNotesChange,
  courseName = 'Course',
  lessonName = 'Lesson',
  videoId,
  lessonId,
  onAutoSaveStatusChange,
}) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isPreview, setIsPreview] = useState(false);
  const { downloadAsText, downloadAsMarkdown, downloadAsPDF, isDownloading } = useNotesDownload();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNotesChange = (value: string) => {
    onNotesChange(value);
    setSaveStatus(value.trim() ? 'saving' : 'idle');
  };

  // Autosave notes to backend
  useEffect(() => {
    if (!videoId || !notes.trim()) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => { // 2-second debounce
      try {
        // Use lesson endpoint if available, otherwise fall back to YouTube notes endpoint
        if (lessonId) {
          await apiClient.post(`/lessons/${lessonId}/save_notes/`, {
            notes,
            timestamps: [],
          });
        } else {
          await apiClient.post('/youtube/save-notes/', {
            video_id: videoId,
            notes,
            timestamps: [],
          });
        }
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to autosave notes', error);
        setSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, videoId, lessonId]);

  useEffect(() => {
    onAutoSaveStatusChange?.(saveStatus);
  }, [saveStatus, onAutoSaveStatusChange]);

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
      {/* Header with Download Options and Tabs */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPreview(false)}
            className={`text-sm font-semibold transition-colors ${!isPreview ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`text-sm font-semibold transition-colors ${isPreview ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Preview
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDownload('txt')}
            disabled={!notes.trim() || isDownloading}
            className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as text file"
          >
            TXT
          </button>
          <button
            onClick={() => handleDownload('md')}
            disabled={!notes.trim() || isDownloading}
            className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isPreview ? (
          <div className="absolute inset-0 overflow-y-auto p-4 bg-white dark:bg-slate-900 prose dark:prose-invert max-w-none">
            <MarkdownRenderer content={notes || '*No notes yet...*'} />
          </div>
        ) : (
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Start typing your notes here... (Supports LaTeX: $x^2$)"
            className="w-full h-full p-4 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        )}
      </div>

      {/* Word Count & Auto-save Status */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
        <span>{notes.trim() ? notes.trim().split(/\s+/).length : 0} words</span>
        {videoId && (
          <span className="flex items-center gap-1.5">
            {saveStatus === 'saving' && <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />}
            {saveStatus === 'saved' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            {saveStatus === 'error' && <span className="h-2 w-2 rounded-full bg-rose-500" />}
            <span>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Auto-saved' : saveStatus === 'error' ? 'Save failed' : ''}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
