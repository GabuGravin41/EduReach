import React, { useState } from 'react';
import { useAuth } from '../src/contexts/useAuth';
import { assessmentService, CreateAssessmentData } from '../src/services/assessmentService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { useQueryClient } from '@tanstack/react-query';
import { ASSESSMENT_KEYS } from '../src/hooks/useAssessments';

interface BulkCreateExamPageProps {
    onCancel: () => void;
    onBatchCreated: () => void;
}

export const BulkCreateExamPage: React.FC<BulkCreateExamPageProps> = ({ onCancel, onBatchCreated }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [topic, setTopic] = useState('');
    const [numTests, setNumTests] = useState(5);
    const [questionsPerTest, setQuestionsPerTest] = useState(10);
    const [timeLimit, setTimeLimit] = useState(30);
    const [prefix, setPrefix] = useState('Olympiad Practice');
    const [isCreating, setIsCreating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic) {
            setError('Please specify a topic');
            return;
        }

        setIsCreating(true);
        setError('');
        setProgress(0);

        try {
            const batch: CreateAssessmentData[] = [];
            for (let i = 1; i <= numTests; i++) {
                batch.push({
                    title: `${prefix} #${i} - ${topic}`,
                    topic: topic,
                    description: `Automated test #${i} generated for ${topic} Olympiad preparation.`,
                    time_limit_minutes: timeLimit,
                    is_public: true,
                    results_visibility: 'opt_in_public',
                    // In a real app, we might call AI to generate questions here or on the backend
                    // For now, we'll create the "containers" and the user can import AI questions later
                    // Or we can just create 1 dummy question per test if the backend requires questions_data
                    questions_data: [
                        {
                            type: 'mcq',
                            question_text: `Sample question for ${topic} Practice #${i}`,
                            options: ['Option A', 'Option B', 'Option C', 'Option D'],
                            correct_answer_index: 0,
                            points: 1
                        }
                    ]
                });
            }

            await assessmentService.bulkCreateAssessments(batch);
            queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
            onBatchCreated();
        } catch (err: any) {
            const data = err?.response?.data;
            const msg =
                (typeof data?.detail === 'string' && data.detail) ||
                data?.error ||
                (data?.assessments && typeof data.assessments === 'object' && JSON.stringify(data.assessments)) ||
                (typeof data === 'object' && Object.keys(data).length && JSON.stringify(data)) ||
                err?.message ||
                'Failed to create batch assessments. Check your plan limit and try again.';
            setError(msg);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-8 py-10 text-white">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <SparklesIcon className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold">Bulk Assessment Creator</h1>
                    </div>
                    <p className="text-indigo-100 text-lg opacity-90">
                        Generate multiple practice tests for Olympiad preparation in seconds.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-3">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Core Setup */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
                                    Primary Topic
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Theoretical Physics, Geometry"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
                                    Test Title Prefix
                                </label>
                                <input
                                    type="text"
                                    value={prefix}
                                    onChange={(e) => setPrefix(e.target.value)}
                                    placeholder="e.g. Olympiad Prep"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Right Column: Numbers */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
                                        Quantity
                                    </label>
                                    <select
                                        value={numTests}
                                        onChange={(e) => setNumTests(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    >
                                        {[5, 10, 15, 20].map(n => (
                                            <option key={n} value={n}>{n} Tests</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">
                                        Time (Min)
                                    </label>
                                    <input
                                        type="number"
                                        value={timeLimit}
                                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300 mb-2">
                                    <BookOpenIcon className="w-5 h-5" />
                                    <span className="font-bold">Output Preview</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    We will generate <strong>{numTests}</strong> assessments titled:<br />
                                    <span className="italic font-medium text-slate-800 dark:text-slate-200">
                                        "{prefix} #1 - {topic || '...'}"
                                    </span><br />
                                    through <br />
                                    <span className="italic font-medium text-slate-800 dark:text-slate-200">
                                        "{prefix} #{numTests} - {topic || '...'}"
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !topic}
                            className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-indigo-500/25 ${isCreating || !topic
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                                }`}
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Batch...
                                </>
                            ) : (
                                <>
                                    <ClipboardCheckIcon className="w-5 h-5" />
                                    Generate Olympiad Batch
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <p className="mt-6 text-center text-slate-500 dark:text-slate-500 text-sm">
                Each test will be created with placeholder questions. Use the <strong>Import with AI</strong> tool inside each test to populate them with high-quality Olympiad problems.
            </p>
        </div>
    );
};
