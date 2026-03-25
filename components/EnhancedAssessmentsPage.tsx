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
    const [filterAssessmentType, setFilterAssessmentType] = useState<'all' | 'quiz' | 'exam'>('all');
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
            alert(`You've reached your monthly limit of ${tierUsage.assessments_limit} assessments. Resets in ${daysUntilReset} days.`);
            setView('billing');
            return;
        }

        // All question types route to create_exam page which supports them all
        if (examType === 'ai_generated') {
            if (!features.can_use_ai) {
                alert('AI-generated quizzes are available for Learner, Pro, and Pro Plus users. Please upgrade to access this feature.');
                setView('billing');
                return;
            }
            setView('generate_ai_quiz');
        } else {
            // Essay, Passage, Multiple Choice all go to the same create page
            // The create page already has UI for all question types
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

        const matchesAssessmentType = filterAssessmentType === 'all' || exam.assessment_type === filterAssessmentType;

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
                const aScore = parseFloat(a.score.split('/')[0]) / parseFloat(a.score.split('/')[1]) || 0;
                const bScore = parseFloat(b.score.split('/')[0]) / parseFloat(b.score.split('/')[1]) || 0;
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

            {/* Join a challenge — paste a link to open an assessment and join its challenge */}
            <div className="mb-8 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-800/50 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Join a challenge</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Have a challenge link? Paste it below to open the assessment and join. You can then take the assessment and compare results with others.</p>
                        <input
                            type="text"
                            value={challengeLinkInput}
                            onChange={(e) => { setChallengeLinkInput(e.target.value); setChallengeLinkError(''); }}
                            placeholder="https://.../assessments/123?share_token=..."
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {challengeLinkError && <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{challengeLinkError}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={handleJoinChallengeByLink}
                        className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <SwordsIcon className="w-5 h-5" />
                        Open & join
                    </button>
                </div>
            </div>

            {/* Public challenges — discoverable by everyone on the platform */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <SwordsIcon className="w-6 h-6 text-amber-500" />
                    Public challenges
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Challenges from others on the platform. Join any to take the assessment and compare results.</p>
                {publicChallengesLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 py-4">
                        <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Loading…
                    </div>
                ) : publicChallenges.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4">No public challenges right now. Create one by opening an assessment and choosing Challenge → Public challenge.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicChallenges.map((ch) => (
                            <div
                                key={ch.id}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col"
                            >
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{ch.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {ch.creator_username && <span>by {ch.creator_username}</span>}
                                    {ch.creator_username && ch.topic && ' · '}
                                    {ch.topic}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {ch.question_count} questions · {ch.time_limit_minutes} min
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const qs = ch.share_token ? `?share_token=${ch.share_token}` : '';
                                        navigate(`/assessments/${ch.id}${qs}`);
                                    }}
                                    className="mt-3 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    <SwordsIcon className="w-4 h-4" />
                                    Join challenge
                                </button>
                            </div>
                        ))}
                    </div>
                )}
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
                    {safeTier === 'free' && (
                        <button
                            onClick={() => setView('billing')}
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
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${features.can_create_essay
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
                        className={`p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors group ${features.can_create_passage
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
                </div>
            </div>

            {/* ── Status + sort row ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'completed'] as const).map((f) => {
                        const count = f === 'all'
                            ? (assessments || []).length
                            : f === 'completed'
                                ? (assessments || []).filter(a => a.status === 'completed').length
                                : (assessments || []).filter(a => a.status !== 'completed').length;
                        return (
                            <button
                                key={f}
                                onClick={() => setFilterType(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    filterType === f
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                {f} ({count})
                            </button>
                        );
                    })}
                    {onBulkCreate && (
                        <button
                            onClick={onBulkCreate}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            <SparklesIcon className="w-4 h-4 text-white" />
                            Bulk Creator
                        </button>
                    )}
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

            {/* ── Search and Advanced Filters ──────────────────────────────────────── */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Search assessments by title, topic, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    {uniqueSubjects.length > 0 && (
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Subjects</option>
                            {uniqueSubjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    )}
                </div>
                {/* Tag filter chips */}
                {uniqueTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-center">Tags:</span>
                        <button
                            onClick={() => setFilterTag('all')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                filterTag === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                        >
                            All
                        </button>
                        {uniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag === filterTag ? 'all' : tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterTag === tag
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
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
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <ClipboardCheckIcon className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {filterAssessmentType === 'quiz'
                            ? 'No quizzes found'
                            : filterAssessmentType === 'exam'
                                ? 'No exams found'
                                : filterType !== 'all'
                                    ? `No ${filterType} assessments`
                                    : searchQuery
                                        ? `No results for "${searchQuery}"`
                                        : 'No assessments yet'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                        {filterAssessmentType === 'quiz'
                            ? 'No quizzes match your filters. Quizzes are short, practice-focused assessments. Create one or adjust your filters.'
                            : filterAssessmentType === 'exam'
                                ? 'No exams match your filters. Exams are formal, timed assessments. Create one or adjust your filters.'
                                : filterType !== 'all' || searchQuery
                                    ? 'Try adjusting your filters or search query.'
                                    : 'Create your first quiz or exam to test your knowledge, or try an AI-generated quiz.'}
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <button
                            onClick={() => handleCreateNew('multiple_choice')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2"
                        >
                            <span className="w-2 h-2 rounded-full bg-white" />
                            Create a Quiz
                        </button>
                        <button
                            onClick={() => handleCreateNew('essay')}
                            className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold flex items-center gap-2"
                        >
                            <span className="w-2 h-2 rounded-full bg-white" />
                            Create an Exam
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sortedAssessments.map((exam, idx) => (
                        <div
                            key={`assessment-${idx}-${exam.id ?? 'local'}`}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
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
                                                {((exam as any).tags || []).includes('ai-generated') ? (
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
                                            {/* Tags */}
                                            {((exam as any).tags || []).filter((t: string) => t !== 'ai-generated' && t !== 'quiz' && t !== 'exam').length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {((exam as any).tags || []).filter((t: string) => t !== 'ai-generated' && t !== 'quiz' && t !== 'exam').map((tag: string) => (
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
                    ))}
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
