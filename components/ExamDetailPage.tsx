import React from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { View } from '../App';

// This defines the structure of an assessment object
interface Assessment {
    id: number;
    title: string;
    topic: string;
    questions: number;
    time: number;
    status: string;
    score: string;
    description?: string;
}

interface ExamDetailPageProps {
    exam: Assessment;
    setView: (view: View) => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({ exam, setView }) => {

    if (!exam) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold">Exam Not Found</h2>
                <button onClick={() => setView('assessments')} className="mt-4 text-indigo-600 hover:underline">
                    Return to Assessments
                </button>
            </div>
        );
    }

    const isCompleted = exam.status === 'completed' && exam.score;
    // Mocking a date for display purposes for completed exams
    const completedDate = '2023-10-26'; 

    return (
        <div>
            <button onClick={() => setView('assessments')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                <ChevronLeftIcon className="w-5 h-5" />
                Back to Assessments
            </button>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5">
                <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100">{exam.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{exam.description || 'No description provided.'}</p>
                
                <div className="flex items-center gap-8 mb-8 border-y border-slate-200 dark:border-slate-700 py-4">
                    <div className="flex items-center gap-2">
                        <ClipboardCheckIcon className="w-5 h-5 text-indigo-500" />
                        <span className="font-semibold">{exam.questions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-indigo-500" />
                        <span className="font-semibold">{exam.time} Minute Time Limit</span>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg mb-2">Previous Attempts</h3>
                        {isCompleted ? (
                             <div className="flex items-center gap-3">
                                <UserCircleIcon className="w-8 h-8 text-slate-400" />
                                <div>
                                    <p className="font-semibold">{exam.score}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{completedDate}</p>
                                </div>
                             </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>
                        )}
                    </div>
                    <button className="px-8 py-3 text-lg font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                        {isCompleted ? 'Retake Exam' : 'Start Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
};
