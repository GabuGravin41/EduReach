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
  transcriptRef?: React.Ref<HTMLDivElement>;
}

type ActiveTab = 'transcript' | 'notes';

export const StudyPanel: React.FC<StudyPanelProps> = ({ transcript, notes, onNotesChange, videoId, transcriptRef }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-colors ${
        isActive
          ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg shadow-slate-900/5 w-full h-full flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 flex-shrink-0">
        <TabButton
          label="Transcript"
          icon={<BookTextIcon className="w-5 h-5" />}
          isActive={activeTab === 'transcript'}
          onClick={() => setActiveTab('transcript')}
        />
        <TabButton
          label="My Notes"
          icon={<PencilIcon className="w-5 h-5" />}
          isActive={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'transcript' && (
          transcript.trim() ? (
            <TranscriptPanel ref={transcriptRef} transcript={transcript} />
          ) : (
            <EmptyState
              title="No transcript yet"
              description="Paste or fetch a transcript to start studying."
              className="h-full flex flex-col justify-center"
            />
          )
        )}
        {activeTab === 'notes' && (
          <NotesPanel notes={notes} onNotesChange={onNotesChange} videoId={videoId} />
        )}
      </div>
    </div>
  );
};