import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { ChallengeModal } from './ChallengeModal';
import { View, UserTier } from '../App';
import { assessmentService, type PublicChallengeItem } from '../src/services/assessmentService';
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
    assessment_type?: 'quiz' | 'exam';
    created_at?: string;
    share_token?: string;
    source_attribution?: string;
    source_year?: number | null;
    source_url?: string;
    tags?: string[];
    competition_country?: string;
    competition_name?: string;
    competition_language?: string;
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
    onBulkCreate?: () => void;
    userTier: UserTier;
    tierUsage: TierUsage;
    userProfile?: {
        learning_goal?: string;
        learner_type?: string;
        interests?: string;
    };
    isLoading?: boolean;
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
    onBulkCreate,
    userTier,
    tierUsage,
    userProfile,
    isLoading = false,
}) => {
    const navigate = useNavigate();
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<{ id: number; title: string; share_token?: string } | null>(null);
    const [challengeLinkInput, setChallengeLinkInput] = useState('');
    const [challengeLinkError, setChallengeLinkError] = useState('');
    const [publicChallenges, setPublicChallenges] = useState<PublicChallengeItem[]>([]);
    const [publicChallengesLoading, setPublicChallengesLoading] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'completed' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAssessmentType, setFilterAssessmentType] = useState<'all' | 'quiz' | 'exam' | 'recommended'>('all');
    const [filterSubject, setFilterSubject] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');

    useEffect(() => {
        let mounted = true;
        setPublicChallengesLoading(true);
        assessmentService.getPublicChallenges()
            .then((list) => { if (mounted) setPublicChallenges(Array.isArray(list) ? list : []); })
            .catch(() => { if (mounted) setPublicChallenges([]); })
            .finally(() => { if (mounted) setPublicChallengesLoading(false); });
        return () => { mounted = false; };
    }, []);
    const [sortBy, setSortBy] = useState<'recent' | 'difficulty' | 'score'>('recent');

    const safeTier: UserTier = userTier in TIER_FEATURES ? userTier : 'free';
    const features = TIER_FEATURES[safeTier];
    const usage = tierUsage ?? { assessments_used: 0, assessments_limit: Infinity, resets_at: new Date().toISOString() };
    const canCreateMore = usage.assessments_used < usage.assessments_limit;
    const daysUntilReset = Math.ceil((new Date(usage.resets_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const handleChallengeClick = (e: React.MouseEvent, exam: Assessment) => {
        e.stopPropagation();
        setSelectedExam({ id: exam.id, title: exam.title, share_token: exam.share_token });
        setIsChallengeModalOpen(true);
    };

    const handleJoinChallengeByLink = () => {
        setChallengeLinkError('');
        const raw = challengeLinkInput.trim();
        if (!raw) {
            setChallengeLinkError('Paste a challenge link first.');
            return;
        }
        try {
            let pathname = '';
            let search = '';
            if (raw.startsWith('http://') || raw.startsWith('https://')) {
                const url = new URL(raw);
                pathname = url.pathname || '';
                search = url.search || '';
            } else {
                const [p, q] = raw.split('?');
                pathname = (p || raw).trim();
                search = q ? `?${q}` : '';
            }
            if (!pathname.match(/\/assessments\/\d+/)) {
                setChallengeLinkError('Link should point to an assessment (e.g. …/assessments/5 or …/assessments/5?share_token=…)');
                return;
            }
            navigate(pathname + search);
        } catch {
            setChallengeLinkError('Invalid link. Paste the full challenge URL.');
        }
    };

    const handleCreateNew = (examType: 'multiple_choice' | 'essay' | 'passage' | 'ai_generated') => {
        if (!canCreateMore) {
            setView('billing');
            return;
        }
        if (examType === 'ai_generated') {
            if (!features.can_use_ai) {
                setView('billing');
                return;
            }
            setView('generate_ai_quiz');
        } else if (examType === 'essay' && !features.can_create_essay) {
            setView('billing');
        } else if (examType === 'passage' && !features.can_create_passage) {
            setView('billing');
        } else {
            setView('create_exam');
        }
    };

    if (!assessments) return null;

    // Get unique subjects for filter dropdown
    const uniqueSubjects = Array.from(new Set((assessments || []).map(a => a.topic).filter(Boolean)));

    // Get unique tags from all assessments for tag filter
    const uniqueTags = Array.from(new Set(
        (assessments || []).flatMap(a => (a as any).tags || []).filter(Boolean)
    )).sort();

    // Group assessments by title to detect duplicates
    const titleCounts = (assessments || []).reduce((acc, assessment) => {
        acc[assessment.title] = (acc[assessment.title] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const processedAssessments = (assessments || []).map(assessment => {
        const creator = (assessment as any).created_by_username || (assessment as any).creator_username || '';
        let displayTitle = assessment.title;
        if (titleCounts[assessment.title] > 1) {
            const parts = [assessment.topic];
            if (creator) parts.push(`by ${creator}`);
            if (assessment.created_at) parts.push(new Date(assessment.created_at).toLocaleDateString());
            displayTitle = `${assessment.title} (${parts.join(' — ')})`;
        }
        return { ...assessment, displayTitle, _creator: creator };
    });

    const filteredAssessments = processedAssessments.filter(exam => {
        const matchesStatus = filterType === 'all'
            ? true
            : filterType === 'completed'
                ? exam.status === 'completed'
                : exam.status !== 'completed';

        const isRecommended = () => {
            if (!userProfile) return false;
            // interests may be a comma-joined string or an array serialised as string
            const rawInterests = userProfile.interests || '';
            const interestList = rawInterests.split(/[,\s]+/).map(s => s.toLowerCase()).filter(Boolean);
            const topic = (exam.topic || '').toLowerCase();
            const title = (exam.displayTitle || '').toLowerCase();
            const desc = (exam.description || '').toLowerCase();
            const topicMatchesInterest = interestList.some(i => topic.includes(i) || title.includes(i));
            const goalMatch = (userProfile.learning_goal || '').toLowerCase();
            const typeMatch = (userProfile.learner_type || '').toLowerCase();
            return (
                topicMatchesInterest ||
                (goalMatch && desc.includes(goalMatch)) ||
                (typeMatch === 'university' && desc.includes('university')) ||
                (typeMatch === 'high_school' && (desc.includes('high school') || desc.includes('secondary')))
            );
        };

        const matchesAssessmentType = filterAssessmentType === 'all' 
            || (filterAssessmentType === 'recommended' ? isRecommended() : exam.assessment_type === filterAssessmentType);

        const matchesSubject = filterSubject === 'all' || exam.topic === filterSubject;

        const matchesSearch = !searchQuery.trim() ||
            exam.displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (exam.description || '').toLowerCase().includes(searchQuery.toLowerCase());

        const examTags: string[] = (exam as any).tags || [];
        const matchesTag = filterTag === 'all' || examTags.includes(filterTag);

        return matchesStatus && matchesAssessmentType && matchesSubject && matchesSearch && matchesTag;
    });

    const sortedAssessments = [...filteredAssessments].sort((a, b) => {
        if (sortBy === 'difficulty') {
            const difficultyOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
            return (difficultyOrder[a.difficulty || 'medium'] || 2) - (difficultyOrder[b.difficulty || 'medium'] || 2);
        }
        if (sortBy === 'score') {
            if (a.status === 'completed' && b.status === 'completed') {
                const aParts = (a.score ?? '0/0').split('/');
                const bParts = (b.score ?? '0/0').split('/');
                const aScore = (parseFloat(aParts[0]) || 0) / (parseFloat(aParts[1]) || 1);
                const bScore = (parseFloat(bParts[0]) || 0) / (parseFloat(bParts[1]) || 1);
                return bScore - aScore;
            }
            return 0;
        }
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

    // ── Real stat calculations from actual assessment data ──────────────────
    const completedAssessments = (assessments || []).filter(a => a.status === 'completed');
    const avgScore = completedAssessments.length > 0
        ? Math.round(
            completedAssessments.reduce((sum, a) => {
                const parts = (a.score || '0/0').split('/');
                const earned = parseFloat(parts[0]) || 0;
                const total = parseFloat(parts[1]) || 0;
                return sum + (total > 0 ? (earned / total) * 100 : 0);
            }, 0) / completedAssessments.length
          )
        : null;
    const quizCount = (assessments || []).filter(a => a.assessment_type === 'quiz').length;
    const examCount = (assessments || []).filter(a => a.assessment_type === 'exam').length;

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto animate-pulse">
                <div className="h-10 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
                <div className="h-4 w-80 bg-slate-200 dark:bg-slate-700 rounded mb-8" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Assessments</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Create and take quizzes and exams to test your knowledge
                    </p>
                </div>
                {/* Quick type guide badges */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">QUIZ</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">— quick practice</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">EXAM</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400">— formal, timed</span>
                    </div>
                </div>
            </div>

            {/* Real Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{completedAssessments.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">of {(assessments || []).length} total</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Score</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                        {avgScore !== null ? `${avgScore}%` : '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {completedAssessments.length > 0 ? `across ${completedAssessments.length} attempt${completedAssessments.length !== 1 ? 's' : ''}` : 'No attempts yet'}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Limit</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                        {usage.assessments_used}
                        <span className="text-lg font-semibold text-slate-400"> / {usage.assessments_limit === Infinity ? '∞' : usage.assessments_limit}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {usage.assessments_limit !== Infinity ? `Resets in ${daysUntilReset} days` : 'Unlimited plan'}
                    </p>
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
                    {(safeTier === 'free' || safeTier === 'learner') && (
                        <button
                            onClick={() => setView('billing')}
                            className="hidden sm:block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium text-sm"
                        >
                            {safeTier === 'free' ? 'Upgrade for AI & More' : 'Upgrade to Pro'}
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
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${features.can_create_essay
                            ? 'hover:border-green-300 dark:hover:border-green-500'
                            : 'opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <DocumentTextIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Essay Exams</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {features.can_create_essay ? 'Long-form responses' : 'Learner+ feature'}
                        </p>
                    </button>

                    {/* Passage-Based */}
                    <button
                        onClick={() => handleCreateNew('passage')}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${features.can_create_passage
                            ? 'hover:border-purple-300 dark:hover:border-purple-500'
                            : 'opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <BookOpenIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Passage-Based</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {features.can_create_passage ? 'Reading comprehension' : 'Pro+ feature'}
                        </p>
                    </button>

                    {/* AI Generated */}
                    <button
                        onClick={() => handleCreateNew('ai_generated')}
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${features.can_use_ai
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

                {/* Bulk Creator — full-width, visually separate from single-exam options */}
                {onBulkCreate && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-slate-600">
                        <button
                            onClick={onBulkCreate}
                            className="w-full flex items-center gap-3 px-5 py-3 rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-400 dark:hover:border-violet-600 transition-colors group"
                        >
                            <SparklesIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="font-semibold text-sm text-violet-700 dark:text-violet-300">Bulk Creator</span>
                                <span className="text-xs text-violet-500 dark:text-violet-400 ml-2">— import or generate multiple exams at once</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* ── QUIZ vs EXAM prominent filter tabs ───────────────────────────────── */}
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Filter by type</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterAssessmentType('all')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            filterAssessmentType === 'all'
                                ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                    >
                        All ({(assessments || []).length})
                    </button>
                    <button
                        onClick={() => setFilterAssessmentType('quiz')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            filterAssessmentType === 'quiz'
                                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-600'
                        }`}
                    >
                        <span className="inline-block w-2 h-2 rounded-full bg-current opacity-80" />
                        QUIZ ({quizCount})
                        <span className="hidden sm:inline text-xs font-normal opacity-75">· practice</span>
                    </button>
                    <button
                        onClick={() => setFilterAssessmentType('exam')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            filterAssessmentType === 'exam'
                                ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:border-amber-400 dark:hover:border-amber-600'
                        }`}
                    >
                        <span className="inline-block w-2 h-2 rounded-full bg-current opacity-80" />
                        EXAM ({examCount})
                        <span className="hidden sm:inline text-xs font-normal opacity-75">· formal, timed</span>
                    </button>
                    {userProfile && (userProfile.learning_goal || userProfile.interests) && (
                        <button
                            onClick={() => setFilterAssessmentType('recommended')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                filterAssessmentType === 'recommended'
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                    : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400 dark:hover:border-emerald-600'
                            }`}
                        >
                            <SparklesIcon className="w-4 h-4" />
                            RECOMMENDED
                        </button>
                    )}
                </div>
            </div>

            {/* ── Search, filters and sort — single compact row ─────────────────── */}
            <div className="mb-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="Search by title, topic, or description…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    />
                    <div className="flex gap-2 flex-shrink-0">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        >
                            <option value="all">All status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                        {uniqueSubjects.length > 0 && (
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All subjects</option>
                                {uniqueSubjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        >
                            <option value="recent">Recent</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="score">Score</option>
                        </select>
                    </div>
                </div>

                {/* Tag filter chips — only shown if tags exist */}
                {uniqueTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterTag('all')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                filterTag === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            All tags
                        </button>
                        {uniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag === filterTag ? 'all' : tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterTag === tag
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Assessments Grid or Empty State */}
            {sortedAssessments.length === 0 ? (
                filterType !== 'all' || searchQuery || filterAssessmentType !== 'all' ? (
                    /* Filtered empty — simple message */
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <ClipboardCheckIcon className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-1">No results</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    /* True empty — full discovery UI */
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mb-4">
                                <ClipboardCheckIcon className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No assessments yet</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                                Create your first quiz or exam. You can build from scratch, let AI generate questions, or paste in an existing paper.
                            </p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <button onClick={() => handleCreateNew('multiple_choice')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-sm">
                                    Create from scratch
                                </button>
                                <button onClick={() => setView('generate_ai_quiz')} className="px-5 py-2.5 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors font-semibold text-sm">
                                    Generate with AI
                                </button>
                            </div>
                        </div>

                        {/* Discovery cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                {
                                    icon: '📄',
                                    title: 'Paste a past paper',
                                    desc: 'Have an old exam? Paste the questions and AI will structure them into a proper assessment with marking.',
                                    cta: 'Upload paper →',
                                    onClick: () => handleCreateNew('multiple_choice'),
                                    color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
                                },
                                {
                                    icon: '🎬',
                                    title: 'Quiz from a video',
                                    desc: 'Paste a YouTube link — AI watches it for you and generates quiz questions from the content.',
                                    cta: 'Start a session →',
                                    onClick: () => setView('setup_session'),
                                    color: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20',
                                },
                                {
                                    icon: '✏️',
                                    title: 'Set your own questions',
                                    desc: 'Type or paste any questions you want — MCQ, essay, short answer. AI will format and mark them.',
                                    cta: 'Create exam →',
                                    onClick: () => handleCreateNew('essay'),
                                    color: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20',
                                },
                            ].map(card => (
                                <div key={card.title} className={`rounded-xl border p-5 ${card.color}`}>
                                    <div className="text-2xl mb-2">{card.icon}</div>
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-1">{card.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">{card.desc}</p>
                                    <button onClick={card.onClick} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{card.cta}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sortedAssessments.map((exam, idx) => {
                        const examTags: string[] = ((exam as any).tags || []).filter(
                            (t: string) => t !== 'ai-generated' && t !== 'quiz' && t !== 'exam'
                        );
                        const isAIGenerated = ((exam as any).tags || []).includes('ai-generated');
                        const sourceAttr: string = (exam as any).source_attribution || exam.source_attribution || '';
                        const sourceYear: number | null = (exam as any).source_year ?? exam.source_year ?? null;
                        const sourceUrl: string = (exam as any).source_url || exam.source_url || '';
                        const questionTypes: string[] = exam.question_types || [];
                        const competitionCountry: string = (exam as any).competition_country || exam.competition_country || '';
                        const competitionName: string = (exam as any).competition_name || exam.competition_name || '';
                        const competitionLanguage: string = (exam as any).competition_language || exam.competition_language || '';
                        const isOlympiad = examTags.includes('olympiad') || !!competitionCountry;

                        return (
                        <div
                            key={`assessment-${idx}-${exam.id ?? 'local'}`}
                            className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-200 dark:hover:border-indigo-700/60"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                            {getQuestionTypeIcon(exam.question_types)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{exam.displayTitle}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {/* Prominent QUIZ / EXAM badge */}
                                                {exam.assessment_type === 'exam' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                                        EXAM
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200 shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                                                        QUIZ
                                                    </span>
                                                )}
                                                {isOlympiad && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        ★ OLYMPIAD
                                                    </span>
                                                )}
                                                {isAIGenerated ? (
                                                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                        AI Generated
                                                    </span>
                                                ) : (exam as any)._creator ? (
                                                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                        by {(exam as any)._creator}
                                                    </span>
                                                ) : null}
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{exam.topic}</p>
                                            </div>
                                            {/* Tags — shown at rest, also in hover panel */}
                                            {examTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {examTags.slice(0, 4).map((tag: string) => (
                                                        <span
                                                            key={tag}
                                                            onClick={() => setFilterTag(tag)}
                                                            className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {examTags.length > 4 && (
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                                            +{examTags.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {exam.difficulty && (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(exam.difficulty)}`}>
                                            {exam.difficulty}
                                        </span>
                                    )}
                                </div>

                                {exam.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 group-hover:line-clamp-none transition-all">
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

                                {/* Hover detail panel — expands to show more context */}
                                <div className={`max-h-0 overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOlympiad ? 'group-hover:max-h-56' : 'group-hover:max-h-40'}`}>
                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 pb-1 space-y-2">
                                        {/* Olympiad / competition metadata */}
                                        {isOlympiad && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                {competitionCountry && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Body:</span>
                                                        <span>{competitionCountry}</span>
                                                    </div>
                                                )}
                                                {competitionLanguage && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Language:</span>
                                                        <span>{competitionLanguage}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {competitionName && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Competition: </span>
                                                {competitionName}
                                            </div>
                                        )}
                                        {questionTypes.length > 0 && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Question types: </span>
                                                {questionTypes.map(t => t.replace(/_/g, ' ')).join(', ')}
                                            </div>
                                        )}
                                        {(sourceAttr || sourceYear) && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 flex-wrap">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">Source:</span>
                                                {sourceUrl ? (
                                                    <a
                                                        href={sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer noopener"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                                                    >
                                                        {sourceAttr || `${exam.topic} ${sourceYear}`}
                                                    </a>
                                                ) : (
                                                    <span>{sourceAttr || `${exam.topic} ${sourceYear}`}</span>
                                                )}
                                            </div>
                                        )}
                                        {examTags.length > 4 && (
                                            <div className="flex flex-wrap gap-1">
                                                {examTags.slice(4).map((tag: string) => (
                                                    <span
                                                        key={tag}
                                                        onClick={() => setFilterTag(tag)}
                                                        className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {!sourceAttr && !sourceYear && !competitionCountry && questionTypes.length === 0 && examTags.length <= 4 && (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                                                {exam.assessment_type === 'exam'
                                                    ? `A timed ${exam.time}-min exam covering ${exam.topic}`
                                                    : `A ${exam.questions}-question practice quiz on ${exam.topic}`}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={() => onSelectExam(exam.id)}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                    >
                                        {exam.status === 'completed' ? 'Review' : (exam.assessment_type === 'quiz' ? 'Start Quiz' : 'Start Exam')}
                                    </button>
                                    <button
                                        onClick={(e) => handleChallengeClick(e, exam)}
                                        className="px-4 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors font-medium flex items-center gap-1.5"
                                        title="Challenge someone or create a public challenge"
                                    >
                                        <SwordsIcon className="w-4 h-4" />
                                        Challenge / Share
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {isChallengeModalOpen && selectedExam && (
                <ChallengeModal
                    examTitle={selectedExam.title}
                    assessmentId={selectedExam.id}
                    shareToken={selectedExam.share_token}
                    onClose={() => { setIsChallengeModalOpen(false); setSelectedExam(null); }}
                />
            )}
        </div>
    );
};
