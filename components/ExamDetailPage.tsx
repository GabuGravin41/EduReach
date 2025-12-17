import React from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { View } from '../App';
import type { Assessment, Question } from '../types';
import { QuizView } from './QuizView';

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

    // Convert legacy question formats if needed or use questions_data
    const quizData = exam.questions_data || [];

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-4 flex items-center justify-between">
                <button 
                    onClick={() => setView('assessments')} 
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                    Back to Assessments
                </button>
                <div className="text-sm font-medium text-slate-500">
                    {exam.time} Minutes Limit
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{exam.title}</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{exam.description}</p>
                </div>
                
                <div className="flex-1 min-h-0 overflow-hidden">
                    {quizData.length > 0 ? (
                        <QuizView quiz={quizData as Question[]} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            No questions found for this assessment.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
