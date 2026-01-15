import React, { useState } from 'react';
import { TranscriptPanel } from './TranscriptPanel';
import { NotesPanel } from './NotesPanel';
import { BookTextIcon } from './icons/BookTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { EmptyState } from './EmptyState';

interface StudyPanelProps {
  transcript: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  videoId?: string;
  lessonId?: number;
  transcriptRef?: React.Ref<HTMLDivElement>;
}

type ActiveTab = 'transcript' | 'notes';

export const StudyPanel: React.FC<StudyPanelProps> = ({ transcript, notes, onNotesChange, videoId, lessonId, transcriptRef }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
        isActive
          ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 w-full h-full flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <TabButton
          label="Transcript"
          icon={<BookTextIcon className="w-4 h-4" />}
          isActive={activeTab === 'transcript'}
          onClick={() => setActiveTab('transcript')}
        />
        <TabButton
          label="Notes"
          icon={<PencilIcon className="w-4 h-4" />}
          isActive={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
        />
      </div>
      <div className="flex-1 min-h-0 relative">
        {activeTab === 'transcript' && (
          transcript.trim() ? (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                <TranscriptPanel ref={transcriptRef} transcript={transcript} />
            </div>
          ) : (
            <EmptyState
              title="No transcript"
              description="Video has no transcript."
              className="h-full flex flex-col justify-center"
            />
          )
        )}
        {activeTab === 'notes' && (
          <div className="absolute inset-0">
            <NotesPanel notes={notes} onNotesChange={onNotesChange} videoId={videoId} lessonId={lessonId} />
          </div>
        )}
      </div>
    </div>
  );
};