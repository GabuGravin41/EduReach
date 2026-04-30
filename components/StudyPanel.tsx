import React, { useState } from 'react';
import { NotesPanel } from './NotesPanel';
import { PencilIcon } from './icons/PencilIcon';

interface StudyPanelProps {
  transcript: string;
  transcriptFetching?: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  videoId?: string;
  lessonId?: number;
  transcriptRef?: React.Ref<HTMLDivElement>;
  onSeekTo?: (seconds: number) => void;
}

type ActiveTab = 'notes';

export const StudyPanel: React.FC<StudyPanelProps> = ({ notes, onNotesChange, videoId, lessonId }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 w-full h-full flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0 px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
          <PencilIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Notes
        </h3>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <NotesPanel notes={notes} onNotesChange={onNotesChange} videoId={videoId} lessonId={lessonId} />
        </div>
      </div>
    </div>
  );
};