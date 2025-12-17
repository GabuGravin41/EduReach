import React, { useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { ChallengeModal } from './ChallengeModal';
import { View, UserTier } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilIcon } from './icons/PencilIcon';
import type { Assessment } from '../types';

interface TierUsage {
    assessments_used: number;
    assessments_limit: number;
    resets_at: string;
}

interface AssessmentsPageProps {
    assessments: Assessment[];
    onSelectExam: (examId: number) => void;
    setView: (view: View) => void;
    userTier: UserTier;
    tierUsage: TierUsage;
}

export const AssessmentsPage: React.FC<AssessmentsPageProps> = ({ 
    assessments, 
    onSelectExam, 
    setView, 
    userTier,
    tierUsage 
}) => {
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [selectedExamTitle, setSelectedExamTitle] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'completed' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleChallengeClick = (e: React.MouseEvent, title: string) => {
        e.stopPropagation();
        setSelectedExamTitle(title);
        setIsChallengeModalOpen(true);
    };

    const handleCreateNew = (view: 'create_exam' | 'generate_ai_quiz') => {
        setView(view);
    };

    const filteredAssessments = assessments.filter(exam => {
        const matchesFilter = filterType === 'all' 
            ? true 
            : filterType === 'completed' 
                ? exam.status === 'completed' 
                : exam.status !== 'completed';
        
        const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              exam.topic.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-semibold opacity-90">Completed Exams</h3>
                    <p className="text-4xl font-bold mt-2">{assessments.filter(a => a.status === 'completed').length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-semibold opacity-90">Average Score</h3>
                    <p className="text-4xl font-bold mt-2">85%</p>
                </div>
                <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-semibold opacity-90">Monthly Limit</h3>
                    <p className="text-4xl font-bold mt-2">{tierUsage.assessments_used} / {tierUsage.assessments_limit === Infinity ? '∞' : tierUsage.assessments_limit}</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search assessments..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-full md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => handleCreateNew('generate_ai_quiz')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        AI Assessment
                    </button>
                    <button 
                        onClick={() => handleCreateNew('create_exam')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <PencilIcon className="w-4 h-4" />
                        Create Manual
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAssessments.map(exam => (
                    <div 
                        key={exam.id} 
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                        onClick={() => onSelectExam(exam.id)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 text-xs rounded font-bold uppercase tracking-wide ${
                                        exam.assessment_type === 'exam' 
                                        ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' 
                                        : 'bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
                                    }`}>
                                        {exam.assessment_type === 'exam' ? 'Exam' : 'Quiz'}
                                    </span>
                                    <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs rounded font-medium uppercase tracking-wide">
                                        {exam.topic}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {exam.title}
                                </h3>
                            </div>
                            {exam.status === 'completed' && (
                                <div className="text-right">
                                    <span className="block text-2xl font-bold text-teal-600 dark:text-teal-400">{exam.score}</span>
                                    <span className="text-xs text-slate-500">Score</span>
                                </div>
                            )}
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-2">
                            {exam.description || 'No description provided.'}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                    <ClipboardCheckIcon className="w-4 h-4" />
                                    {exam.questions} Qs
                                </span>
                                <span className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {exam.time}m
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleChallengeClick(e, exam.title)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title="Challenge a friend"
                                >
                                    <SwordsIcon className="w-5 h-5" />
                                </button>
                                <button className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    {exam.status === 'completed' ? 'Review' : 'Start'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAssessments.length === 0 && (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <ClipboardCheckIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No assessments found</h3>
                    <p className="text-slate-500">Try adjusting your filters or create a new one.</p>
                </div>
            )}

            {isChallengeModalOpen && (
                <ChallengeModal 
                    examTitle={selectedExamTitle} 
                    onClose={() => setIsChallengeModalOpen(false)} 
                />
            )}
        </div>
    );
};
