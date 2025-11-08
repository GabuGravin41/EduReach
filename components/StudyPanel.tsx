import React, { useState } from 'react';
import { TranscriptPanel } from './TranscriptPanel';
import { NotesPanel } from './NotesPanel';
import { BookTextIcon } from './icons/BookTextIcon';
import { PencilIcon } from './icons/PencilIcon';

interface StudyPanelProps {
  transcript: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}

type ActiveTab = 'transcript' | 'notes';

export const StudyPanel: React.FC<StudyPanelProps> = ({ transcript, notes, onNotesChange }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
        isActive
          ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 w-full">
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
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
      <div className="p-4">
        {activeTab === 'transcript' && <TranscriptPanel transcript={transcript} />}
        {activeTab === 'notes' && <NotesPanel notes={notes} onNotesChange={onNotesChange} />}
      </div>
    </div>
  );
};