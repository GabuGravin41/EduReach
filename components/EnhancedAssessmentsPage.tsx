import React, { useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { ChallengeModal } from './ChallengeModal';
import { View, UserTier } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilIcon } from './icons/PencilIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PencilIcon as DocumentTextIcon } from './icons/PencilIcon';

interface Assessment {
    id: number;
    title: string;
    topic: string;
    questions: number;
    time: number;
    status: string;
    score: string;
    description?: string;
    question_types?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    created_at?: string;
}

interface TierUsage {
    assessments_used: number;
    assessments_limit: number;
    resets_at: string; // ISO date string
}

interface EnhancedAssessmentsPageProps {
    assessments: Assessment[];
    onSelectExam: (examId: number) => void;
    setView: (view: View) => void;
    userTier: UserTier;
    tierUsage: TierUsage;
}

const TIER_FEATURES = {
    free: {
        name: 'Free - Get Started',
        assessments_per_month: 5,
        ai_generated_per_month: 2, // 2 free AI assessments
        youtube_ai_quizzes: 2, // 2 free YouTube AI quizzes
        can_create_essay: false,
        can_create_passage: false,
        can_access_community: 'read_only', // Community browsing (read-only)
        can_use_ai: true, // Limited AI access
        can_create_advanced: false,
        can_access_youtube: true, // YouTube integration for all users
        max_questions_per_exam: 10,
        features: ['📺 YouTube Video Learning (Full Access)', '🤖 2 Free AI Assessments', '📝 Basic Assessments (MC, T/F)', '👀 Community Browsing', '📊 Basic Progress Tracking'],
        price: 'Free'
    },
    learner: {
        name: 'Learner - AI-Powered Learning',
        assessments_per_month: 50,
        ai_generated_per_month: 10, // 10 AI questions/month
        youtube_ai_quizzes: 'unlimited',
        can_create_essay: true, // Essay questions included
        can_create_passage: false,
        can_access_community: true, // Full community access
        can_use_ai: true,
        can_create_advanced: false,
        can_access_youtube: true,
        has_ai_essay_grading: true, // Basic AI essay grading
        max_questions_per_exam: 50,
        features: ['📺 Unlimited YouTube Learning', '🤖 AI Quiz Generation (10/month)', '✍️ Essay Questions + Basic AI Grading', '💬 Full Community Access', '📊 Video Learning Sessions'],
        price: '$4.99/month'
    },
    pro: {
        name: 'Pro - Advanced Creator',
        assessments_per_month: 'unlimited',
        ai_generated_per_month: 'unlimited',
        youtube_ai_quizzes: 'unlimited',
        can_create_essay: true,
        can_create_passage: true,
        can_access_community: true,
        can_use_ai: true,
        can_create_advanced: true, // Matching, Ordering, Fill-in-blanks, Cloze
        can_share_assessments: true,
        can_create_courses: true, // Course creation & management
        has_advanced_analytics: true,
        has_ai_essay_grading: 'advanced', // Advanced AI grading
        max_questions_per_exam: 'unlimited',
        features: ['🔄 All Assessment Types (Cloze, Matching, Ordering)', '📚 Course Creation & Management', '📈 Advanced Analytics & Learning Gaps', '💰 Share & Monetize Content', '🎯 Real-time Features'],
        price: '$9.99/month'
    },
    pro_plus: {
        name: 'Premium - Ultimate Platform',
        assessments_per_month: 'unlimited',
        ai_generated_per_month: 'unlimited',
        youtube_ai_quizzes: 'unlimited',
        can_create_essay: true,
        can_create_passage: true,
        can_access_community: true,
        can_use_ai: true,
        can_create_advanced: true,
        can_share_assessments: true,
        can_create_courses: true,
        has_adaptive_testing: true, // Adaptive AI testing
        has_ai_tutor: true, // AI tutor/assistant
        has_priority_ai: true,
        has_advanced_analytics: true,
        has_export_tools: true, // PDF/Word exports
        has_admin_tools: true, // Admin panel access
        max_questions_per_exam: 'unlimited',
        features: ['🧠 Adaptive AI Testing', '🤖 AI Tutor & Assistant', '📄 Unlimited Exports (PDF/Word)', '🏷️ Custom Branding & White-label', '👑 Admin Tools & Priority Support'],
        price: '$19.99/month'
    },
    admin: {
        name: 'Admin',
        assessments_per_month: 'unlimited',
        ai_generated_per_month: 'unlimited',
        youtube_ai_quizzes: 'unlimited',
        can_create_essay: true,
        can_create_passage: true,
        can_access_community: true,
        can_use_ai: true,
        can_create_advanced: true,
        can_share_assessments: true,
        can_create_courses: true,
        has_adaptive_testing: true,
        has_ai_tutor: true,
        has_priority_ai: true,
        has_advanced_analytics: true,
        has_export_tools: true,
        has_admin_tools: true,
        max_questions_per_exam: 'unlimited',
        features: ['👑 Full Platform Access', '👥 User Management', '📊 Platform Analytics', '🔧 System Administration'],
        price: 'Admin'
    }
};

const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
        case 'easy': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
        case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
        case 'hard': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
        default: return 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-700';
    }
};

const getQuestionTypeIcon = (types?: string[]) => {
    if (!types || types.length === 0) return <ClipboardCheckIcon className="w-4 h-4" />;
    if (types.includes('essay')) return <DocumentTextIcon className="w-4 h-4" />;
    if (types.includes('passage')) return <BookOpenIcon className="w-4 h-4" />;
    return <ClipboardCheckIcon className="w-4 h-4" />;
};

export const EnhancedAssessmentsPage: React.FC<EnhancedAssessmentsPageProps> = ({ 
    assessments, 
    onSelectExam, 
    setView, 
    userTier,
    tierUsage 
}) => {
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [selectedExamTitle, setSelectedExamTitle] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'completed' | 'pending'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'difficulty' | 'score'>('recent');

    const features = TIER_FEATURES[userTier];
    const canCreateMore = tierUsage.assessments_used < tierUsage.assessments_limit;
    const daysUntilReset = Math.ceil((new Date(tierUsage.resets_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const handleChallengeClick = (e: React.MouseEvent, title: string) => {
        e.stopPropagation();
        setSelectedExamTitle(title);
        setIsChallengeModalOpen(true);
    };

    const handleCreateNew = (examType: 'multiple_choice' | 'essay' | 'passage' | 'ai_generated') => {
        if (!canCreateMore) {
            alert(`You've reached your monthly limit of ${tierUsage.assessments_limit} assessments. Resets in ${daysUntilReset} days.`);
            setView('pricing');
            return;
        }

        switch (examType) {
            case 'multiple_choice':
                setView('create_exam');
                break;
            case 'essay':
                if (!features.can_create_essay) {
                    alert('Essay exams are available for Pro and Pro Plus users. Please upgrade to access this feature.');
                    setView('pricing');
                    return;
                }
                // TODO: Navigate to essay exam creator
                alert('Essay exam creator coming soon!');
                break;
            case 'passage':
                if (!features.can_create_passage) {
                    alert('Passage-based exams are available for Learner, Pro, and Pro Plus users. Please upgrade to access this feature.');
                    setView('pricing');
                    return;
                }
                // TODO: Navigate to passage exam creator
                alert('Passage exam creator coming soon!');
                break;
            case 'ai_generated':
                if (!features.can_use_ai) {
                    alert('AI-generated quizzes are available for Learner, Pro, and Pro Plus users. Please upgrade to access this feature.');
                    setView('pricing');
                    return;
                }
                setView('generate_ai_quiz');
                break;
        }
    };

    const filteredAssessments = assessments.filter(exam => {
        if (filterType === 'completed') return exam.status === 'completed';
        if (filterType === 'pending') return exam.status !== 'completed';
        return true;
    });

    const sortedAssessments = [...filteredAssessments].sort((a, b) => {
        switch (sortBy) {
            case 'difficulty':
                const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                return (difficultyOrder[a.difficulty || 'medium'] || 2) - (difficultyOrder[b.difficulty || 'medium'] || 2);
            case 'score':
                if (a.status === 'completed' && b.status === 'completed') {
                    const aScore = parseFloat(a.score.split('/')[0]) / parseFloat(a.score.split('/')[1]) || 0;
                    const bScore = parseFloat(b.score.split('/')[0]) / parseFloat(b.score.split('/')[1]) || 0;
                    return bScore - aScore;
                }
                return 0;
            case 'recent':
            default:
                return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        }
    });

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Assessments</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Create and take assessments to test your knowledge
                    </p>
                </div>
                
                {/* Usage Stats */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Usage</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {tierUsage.assessments_used} / {tierUsage.assessments_limit === Infinity ? '∞' : tierUsage.assessments_limit}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            {tierUsage.assessments_limit !== Infinity && `Resets in ${daysUntilReset} days`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Create New Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Assessment</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Current Plan: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{features.name}</span> - {features.price}
                        </p>
                    </div>
                    {userTier === 'free' && (
                        <button 
                            onClick={() => setView('pricing')}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
                        >
                            Upgrade for AI & Community Access
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Multiple Choice */}
                    <button 
                        onClick={() => handleCreateNew('multiple_choice')}
                        className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group"
                    >
                        <ClipboardCheckIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Multiple Choice</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Traditional quiz format</p>
                    </button>

                    {/* Essay Exams */}
                    <button 
                        onClick={() => handleCreateNew('essay')}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${
                            features.can_create_essay 
                                ? 'hover:border-green-300 dark:hover:border-green-500' 
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <DocumentTextIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Essay Exams</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {features.can_create_essay ? 'Long-form responses' : 'Pro+ feature'}
                        </p>
                    </button>

                    {/* Passage-Based */}
                    <button 
                        onClick={() => handleCreateNew('passage')}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${
                            features.can_create_passage 
                                ? 'hover:border-purple-300 dark:hover:border-purple-500' 
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <BookOpenIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Passage-Based</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {features.can_create_passage ? 'Reading comprehension' : 'Learner+ feature'}
                        </p>
                    </button>

                    {/* AI Generated */}
                    <button 
                        onClick={() => handleCreateNew('ai_generated')}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${
                            features.can_use_ai 
                                ? 'hover:border-teal-300 dark:hover:border-teal-500' 
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <SparklesIcon className="w-8 h-8 text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Generated</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {features.can_use_ai ? 'Smart quiz creation' : 'Learner+ feature'}
                        </p>
                    </button>
                </div>
            </div>

            {/* Filters and Sorting */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'all' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                    >
                        All ({assessments.length})
                    </button>
                    <button
                        onClick={() => setFilterType('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'pending' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                    >
                        Pending ({assessments.filter(a => a.status !== 'completed').length})
                    </button>
                    <button
                        onClick={() => setFilterType('completed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'completed' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                    >
                        Completed ({assessments.filter(a => a.status === 'completed').length})
                    </button>
                </div>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="recent">Sort by Recent</option>
                    <option value="difficulty">Sort by Difficulty</option>
                    <option value="score">Sort by Score</option>
                </select>
            </div>

            {/* Assessments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedAssessments.map(exam => (
                    <div 
                        key={exam.id} 
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        {getQuestionTypeIcon(exam.question_types)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{exam.title}</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{exam.topic}</p>
                                    </div>
                                </div>
                                {exam.difficulty && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(exam.difficulty)}`}>
                                        {exam.difficulty}
                                    </span>
                                )}
                            </div>

                            {exam.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                    {exam.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <ClipboardCheckIcon className="w-4 h-4" />
                                    {exam.questions} Questions
                                </span>
                                <span className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {exam.time} mins
                                </span>
                            </div>

                            {exam.status === 'completed' && (
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Last Score</span>
                                        <span className="font-bold text-lg text-teal-600 dark:text-teal-400">{exam.score}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => onSelectExam(exam.id)}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    {exam.status === 'completed' ? 'Review' : 'Start Exam'}
                                </button>
                                <button 
                                    onClick={(e) => handleChallengeClick(e, exam.title)}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <SwordsIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {sortedAssessments.length === 0 && (
                <div className="text-center py-12">
                    <ClipboardCheckIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        {filterType === 'all' ? 'No assessments yet' : `No ${filterType} assessments`}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-500 mb-6">
                        Create your first assessment to get started with testing your knowledge.
                    </p>
                    <button 
                        onClick={() => handleCreateNew('multiple_choice')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Create Assessment
                    </button>
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
