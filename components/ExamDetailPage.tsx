import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { View } from '../App';
import type { Assessment, Question } from '../types';
import { TrophyIcon } from './icons/TrophyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { QuizView } from './QuizView';
import { AssessmentAnalytics } from './AssessmentAnalytics';
import { assessmentService, AssessmentAttempt } from '../src/services/assessmentService';
import { useAuth } from '../src/contexts/useAuth';

interface ExamDetailPageProps {
    exam: Assessment;
    setView: (view: View, opts?: { examId?: number; state?: { editExamId?: number } }) => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({ exam, setView }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [liveExam, setLiveExam] = React.useState<any>(exam);
    const tokenFromUrl = React.useMemo(() => new URLSearchParams(location.search || '').get('share_token'), [location.search]);
    const shareToken = liveExam?.share_token ?? tokenFromUrl ?? undefined;
    const isCreator = !!(user && liveExam?.creator && user.id === liveExam.creator.id);
    const inviteLink =
        shareToken && liveExam?.id
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/assessments/${liveExam.id}?share_token=${shareToken}`
            : '';

    const [isLoadingDetail, setIsLoadingDetail] = React.useState(true);
    const [attempts, setAttempts] = React.useState<AssessmentAttempt[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = React.useState(false);
    const [publicAttempts, setPublicAttempts] = React.useState<AssessmentAttempt[]>([]);
    const [myResultPublic, setMyResultPublic] = React.useState(false);
    const [isSavingVisibility, setIsSavingVisibility] = React.useState(false);
    const [gradingMap, setGradingMap] = React.useState<Record<number, { score: string; percentage: string }>>({});
    const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle');
    const [sidebarTab, setSidebarTab] = React.useState<'grading' | 'analytics'>('grading');

    React.useEffect(() => {
        setLiveExam(exam);
    }, [exam]);

    React.useEffect(() => {
        const load = async () => {
            setIsLoadingDetail(true);
            try {
                const detail = await assessmentService.getAssessment(exam.id);
                setLiveExam(detail as any);
            } catch {
                // keep fallback exam object from props for offline mode
            } finally {
                setIsLoadingDetail(false);
            }
        };
        load();
    }, [exam.id]);

    React.useEffect(() => {
        loadPublicAttempts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveExam?.id]);

    const loadAttempts = async () => {
        if (!isCreator && !shareToken) return;
        setIsLoadingAttempts(true);
        try {
            const data = await assessmentService.getAttempts(liveExam.id, shareToken);
            setAttempts(data);
        } finally {
            setIsLoadingAttempts(false);
        }
    };

    const loadPublicAttempts = async () => {
        try {
            const data = await assessmentService.getPublicResults(liveExam.id);
            setPublicAttempts(data);
        } catch (error) {
            console.error('Failed to load public results', error);
        }
    };

    const handleExport = async () => {
        const blob = await assessmentService.exportAttempts(liveExam.id, shareToken);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment_${liveExam.id}_attempts.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportPDF = async () => {
        const blob = await assessmentService.exportAttemptsPDF(liveExam.id, shareToken);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment_${liveExam.id}_attempts.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleJoinChallenge = async () => {
        try {
            await assessmentService.joinChallenge(liveExam.id);
            alert('Joined challenge successfully!');
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to join challenge');
        }
    };

    const handleManualGrade = async (attemptId: number) => {
        const entry = gradingMap[attemptId];
        if (!entry?.score || !entry?.percentage) return;
        const percentage = Number(entry.percentage);
        await assessmentService.manualGrade(liveExam.id, {
            attempt_id: attemptId,
            score: entry.score,
            percentage: isNaN(percentage) ? 0 : percentage,
        }, shareToken);
        await loadAttempts();
    };

    const handleResultVisibilitySave = async () => {
        setIsSavingVisibility(true);
        try {
            await assessmentService.setResultVisibility(liveExam.id, myResultPublic);
            await loadPublicAttempts();
        } finally {
            setIsSavingVisibility(false);
        }
    };

    const handlePolicyChange = async (value: 'private' | 'opt_in_public' | 'public') => {
        if (!isCreator) return;
        try {
            const updated = await assessmentService.updateAssessment(liveExam.id, { results_visibility: value } as any);
            setLiveExam(updated as any);
            await loadPublicAttempts();
        } catch (error) {
            console.error('Failed to update results visibility policy', error);
        }
    };

    const handleCopyInvite = async () => {
        if (!inviteLink) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteLink);
                setCopyState('copied');
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = inviteLink;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(textarea);
                setCopyState(ok ? 'copied' : 'error');
            }
        } catch (error) {
            console.error('Failed to copy invite link', error);
            setCopyState('error');
        } finally {
            setTimeout(() => setCopyState('idle'), 2000);
        }
    };

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

    // Convert legacy question formats if needed or use questions_data (ensure we always have an array)
    const rawQuestions = liveExam?.questions;
    const questionsArray = Array.isArray(rawQuestions) ? rawQuestions : [];
    const questionsData = liveExam?.questions_data;
    const quizData = Array.isArray(questionsData)
        ? questionsData
        : questionsArray.map((q: any) => ({
            id: String(q.id),
            type:
                q.question_type === 'mcq'
                    ? 'multiple_choice'
                    : q.question_type === 'true_false'
                        ? 'true_false'
                        : q.question_type === 'essay'
                            ? 'essay'
                            : 'short_answer',
            question_text: q.question_text,
            options: q.options || [],
            correct_answer_index: Array.isArray(q.options) ? q.options.indexOf(q.correct_answer) : 0,
            correct_answers: q.correct_answer ? [q.correct_answer] : [],
            correct_answer: q.correct_answer,
            points: q.points || 1,
            explanation: q.explanation || '',
            case_sensitive: false,
            exact_match: false,
            max_length: 400,
        }));

    const imageUploadGraceMinutes: number =
        typeof (liveExam as any).image_upload_grace_minutes === 'number'
            ? (liveExam as any).image_upload_grace_minutes
            : 0;

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView('assessments')}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                        Back to Assessments
                    </button>
                    {isCreator && (
                        <>
                            <button
                                onClick={() => setView('create_exam', { state: { editExamId: liveExam.id } })}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Edit assessment
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Delete "${liveExam.title}"? This cannot be undone.`)) return;
                                    try {
                                        await assessmentService.deleteAssessment(liveExam.id);
                                        setView('assessments');
                                    } catch (e) {
                                        console.error(e);
                                        alert('Failed to delete. You may not have permission.');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
                <div className="text-sm font-medium text-slate-500">
                    {liveExam.time || liveExam.time_limit_minutes || 30} Minutes Limit
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{liveExam.title}</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{liveExam.description}</p>
                    {!isCreator && tokenFromUrl && (
                        <button
                            onClick={handleJoinChallenge}
                            className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold"
                        >
                            Join Challenge
                        </button>
                    )}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                    <div className="min-h-0">
                        {isLoadingDetail ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium">Loading assessment...</p>
                            </div>
                        ) : quizData.length > 0 ? (
                            <QuizView
                                quiz={quizData as Question[]}
                                timeLimitMinutes={liveExam.time || liveExam.time_limit_minutes || 30}
                                assessmentId={liveExam.id}
                                imageUploadGraceMinutes={imageUploadGraceMinutes}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                No questions found for this assessment.
                            </div>
                        )}
                    </div>
                    {/* Sidebar: Creator gets full tools, participants get leaderboard only */}
                    {(isCreator || shareToken) && (
                        <div className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto">
                            {isCreator ? (
                                <>
                                    {/* Tab toggle */}
                                    <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                        {(['grading', 'analytics'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setSidebarTab(tab);
                                                    if (tab === 'analytics' && attempts.length === 0 && !isLoadingAttempts) {
                                                        loadAttempts();
                                                    }
                                                }}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${sidebarTab === tab
                                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                    }`}
                                            >
                                                {tab === 'grading' ? 'Grading' : '📊 Analytics'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Analytics tab */}
                                    {sidebarTab === 'analytics' && (
                                        <AssessmentAnalytics
                                            attempts={attempts}
                                            questions={questionsArray}
                                            isLoading={isLoadingAttempts}
                                        />
                                    )}

                                    {/* Grading tab */}
                                    {sidebarTab === 'grading' && (
                                    <><div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Creator Tools</h3>
                                        <button
                                            onClick={loadAttempts}
                                            className="text-sm px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                    {inviteLink && (
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-500 mb-1">Invite link (read-only grading access)</p>
                                            <div className="flex gap-2">
                                                <input
                                                    value={inviteLink}
                                                    readOnly
                                                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                                />
                                                <button
                                                    onClick={handleCopyInvite}
                                                    className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                >
                                                    {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Failed' : 'Copy Link'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 mb-1">Result visibility policy</p>
                                        <select
                                            value={liveExam.results_visibility || 'opt_in_public'}
                                            onChange={(e) => handlePolicyChange(e.target.value as 'private' | 'opt_in_public' | 'public')}
                                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                        >
                                            <option value="private">Instructor only</option>
                                            <option value="opt_in_public">Students choose public/private</option>
                                            <option value="public">Always public to participants</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        className="w-full mb-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                                    >
                                        Export Attempts (CSV)
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full mb-4 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
                                    >
                                        Export Attempts (PDF)
                                    </button>
                                    {isLoadingAttempts ? (
                                        <p className="text-sm text-slate-500">Loading attempts...</p>
                                    ) : attempts.length === 0 ? (
                                        <p className="text-sm text-slate-500">No attempts yet. Click Refresh to load.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {attempts.map((attempt) => (
                                                <div key={attempt.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold text-sm">{attempt.user?.username || attempt.user_username || 'Student'}</p>
                                                            <p className="text-xs text-slate-500">Score: {attempt.score || '-'}</p>
                                                        </div>
                                                        <span className="text-xs text-slate-500">{attempt.status}</span>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <input
                                                            placeholder="Score (e.g. 8/10)"
                                                            value={gradingMap[attempt.id]?.score || ''}
                                                            onChange={(e) => setGradingMap(prev => ({
                                                                ...prev,
                                                                [attempt.id]: {
                                                                    score: e.target.value,
                                                                    percentage: prev[attempt.id]?.percentage || ''
                                                                }
                                                            }))}
                                                            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                        />
                                                        <input
                                                            placeholder="%"
                                                            value={gradingMap[attempt.id]?.percentage || ''}
                                                            onChange={(e) => setGradingMap(prev => ({
                                                                ...prev,
                                                                [attempt.id]: {
                                                                    score: prev[attempt.id]?.score || '',
                                                                    percentage: e.target.value
                                                                }
                                                            }))}
                                                            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                        />
                                                    </div>
                                                    {Array.isArray(attempt.answer_images) && attempt.answer_images.length > 0 && (
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Submitted image solutions</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {attempt.answer_images.map((img) => (
                                                                    <a
                                                                        key={img.id}
                                                                        href={img.image}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="block rounded border border-slate-200 dark:border-slate-700 overflow-hidden"
                                                                    >
                                                                        <img src={img.image} alt={`Answer ${img.question_id}`} className="w-full h-24 object-cover" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleManualGrade(attempt.id)}
                                                        className="mt-2 w-full px-2 py-1 text-xs rounded bg-indigo-600 text-white"
                                                    >
                                                        Save Grade
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    </> )}
                                    {/* end grading tab */}
                                </>
                            ) : (
                                <>
                                    {/* Participant view: result visibility + leaderboard only */}
                                    <h3 className="text-lg font-bold mb-4">Assessment Results</h3>
                                    {(liveExam.results_visibility || 'opt_in_public') === 'opt_in_public' && (
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-500 mb-1">My result visibility</p>
                                            <div className="flex gap-2">
                                                <select
                                                    value={myResultPublic ? 'public' : 'private'}
                                                    onChange={(e) => setMyResultPublic(e.target.value === 'public')}
                                                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                >
                                                    <option value="private">Private</option>
                                                    <option value="public">Public</option>
                                                </select>
                                                <button
                                                    onClick={handleResultVisibilitySave}
                                                    disabled={isSavingVisibility}
                                                    className="px-3 py-2 text-xs rounded-lg bg-indigo-600 text-white"
                                                >
                                                    {isSavingVisibility ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Leaderboard — visible to both creator and participants */}
                            {publicAttempts.length > 0 && (
                                <div className={isCreator ? "mt-8" : "mt-4"}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                            <TrophyIcon className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Assessment Leaderboard</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {publicAttempts
                                            .slice()
                                            .sort((a, b) => {
                                                const percA = Number(a.percentage || 0);
                                                const percB = Number(b.percentage || 0);
                                                if (percB !== percA) return percB - percA;
                                                return (a.time_taken_seconds || 999999) - (b.time_taken_seconds || 999999);
                                            })
                                            .map((attempt, i) => {
                                                const mins = attempt.time_taken_seconds ? Math.floor(attempt.time_taken_seconds / 60) : 0;
                                                const secs = attempt.time_taken_seconds ? (attempt.time_taken_seconds % 60) : 0;
                                                return (
                                                    <div key={`pub-${attempt.id}`} className={`flex items-center gap-3 p-3 rounded-xl border ${attempt.user?.username === user?.username
                                                        ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-900/20'
                                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                                        }`}>
                                                        <span className="w-5 text-sm font-black text-slate-400">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                                                                {attempt.user?.username || attempt.user_username || 'Student'}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                                                <ClockIcon className="w-3 h-3 text-slate-400" />
                                                                {attempt.time_taken_seconds ? `${mins}m ${secs}s` : '---'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{attempt.percentage ?? 0}%</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{attempt.score || '-'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                            {publicAttempts.length === 0 && !isCreator && (
                                <div className="mt-4 text-center py-6">
                                    <TrophyIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No public results yet. Complete the assessment to see the leaderboard.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
