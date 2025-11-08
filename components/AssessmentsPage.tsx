import React, { useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { ChallengeModal } from './ChallengeModal';
import { View } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilIcon } from './icons/PencilIcon';

interface Assessment {
    id: number;
    title: string;
    topic: string;
    questions: number;
    time: number;
    status: string;
    score: string;
}

interface AssessmentsPageProps {
  assessments: Assessment[];
  onSelectExam: (examId: number) => void;
  setView: (view: View) => void;
  assessmentCount: number;
  assessmentLimit: number;
}

export const AssessmentsPage: React.FC<AssessmentsPageProps> = ({ assessments, onSelectExam, setView, assessmentCount, assessmentLimit }) => {
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedExamTitle, setSelectedExamTitle] = useState('');

  const handleChallengeClick = (e: React.MouseEvent, title: string) => {
    e.stopPropagation();
    setSelectedExamTitle(title);
    setIsChallengeModalOpen(true);
  };

  const handleCreateNew = (view: 'create_exam' | 'generate_ai_quiz') => {
    if (assessmentCount >= assessmentLimit) {
      alert(`You've reached your limit of ${assessmentLimit} exam(s). Please upgrade to create more.`);
      setView('pricing');
    } else {
      setView(view);
    }
  };


  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Assessments</h1>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => handleCreateNew('generate_ai_quiz')}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span>Generate AI Quiz</span>
                </button>
                <button 
                    onClick={() => handleCreateNew('create_exam')}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                >
                    <PencilIcon className="w-5 h-5" />
                    <span>Create Manual Exam</span>
                </button>
            </div>
        </div>
      <div className="space-y-4">
        {assessments.map(exam => (
          <div 
            key={exam.id} 
            onClick={() => onSelectExam(exam.id)}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg shadow-slate-900/5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <ClipboardCheckIcon className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{exam.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>{exam.topic}</span>
                  <span>&bull;</span>
                  <span>{exam.questions} Questions</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {exam.time} mins</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {exam.status === 'completed' && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last Score</p>
                  <p className="font-bold text-lg text-teal-600 dark:text-teal-400">{exam.score}</p>
                </div>
              )}
               <button onClick={(e) => handleChallengeClick(e, exam.title)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <SwordsIcon className="w-4 h-4" />
                <span>Challenge</span>
              </button>
              <button onClick={() => onSelectExam(exam.id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors w-32">
                {exam.status === 'completed' ? 'Review' : 'Start Exam'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {isChallengeModalOpen && <ChallengeModal examTitle={selectedExamTitle} onClose={() => setIsChallengeModalOpen(false)} />}
    </div>
  );
};
