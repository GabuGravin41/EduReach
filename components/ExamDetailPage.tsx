import React from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../src/contexts/ToastContext';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { View } from '../App';
import type { Assessment, Question } from '../types';
import { TrophyIcon } from './icons/TrophyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { SparklesIcon } from './icons/SparklesIcon';
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
    const toast = useToast();
    const location = useLocation();
    const [liveExam, setLiveExam] = React.useState<any>(exam);
    const tokenFromUrl = React.useMemo(() => new URLSearchParams(location.search || '').get('share_token'), [location.search]);
    const shareToken = liveExam?.share_token ?? tokenFromUrl ?? undefined;
    const isCreator = !!(user && liveExam?.creator && String(user.id) === String(liveExam.creator.id));
    const inviteLink =
        shareToken && liveExam?.id
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/assessments/${liveExam.id}?share_token=${shareToken}`
            : '';

    const [isLoadingDetail, setIsLoadingDetail] = React.useState(true);
    const [detailError, setDetailError] = React.useState<string | null>(null);
    const [hasStarted, setHasStarted] = React.useState(false);
    const [previousAttempt, setPreviousAttempt] = React.useState<AssessmentAttempt | null>(null);
    const [quizMode, setQuizMode] = React.useState<'take' | 'review' | 'retake'>('take');
    const [isStartingRetake, setIsStartingRetake] = React.useState(false);
    const [attempts, setAttempts] = React.useState<AssessmentAttempt[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = React.useState(false);
    const [publicAttempts, setPublicAttempts] = React.useState<AssessmentAttempt[]>([]);
    const [myResultPublic, setMyResultPublic] = React.useState(false);
    const [isSavingVisibility, setIsSavingVisibility] = React.useState(false);
    const [gradingMap, setGradingMap] = React.useState<Record<number, { score: string; percentage: string }>>({});
    const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle');
    const [sidebarTab, setSidebarTab] = React.useState<'grading' | 'analytics' | 'proctor'>('grading');

    // Learner side panel
    const [learnerTab, setLearnerTab] = React.useState<'info' | 'monitor'>('info');

    // Proctoring state
    const [showProctorConsent, setShowProctorConsent] = React.useState(false);
    const [proctorConsented, setProctorConsented] = React.useState(false);
    const [tabSwitchCount, setTabSwitchCount] = React.useState(0);
    const [cameraBlocked, setCameraBlocked] = React.useState(false);
    const [cameraActive, setCameraActive] = React.useState(false);
    const [isProctoredSaving, setIsProctoredSaving] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const cameraStreamRef = React.useRef<MediaStream | null>(null);

    React.useEffect(() => {
        setLiveExam(exam);
    }, [exam]);

    React.useEffect(() => {
        const load = async () => {
            setIsLoadingDetail(true);
            setDetailError(null);
            try {
                const [detail, prevAttempt] = await Promise.allSettled([
                    assessmentService.getAssessment(exam.id),
                    assessmentService.getMyAttempt(exam.id),
                ]);
                if (detail.status === 'fulfilled') setLiveExam(detail.value as any);
                else {
                    const err = (detail as PromiseRejectedResult).reason;
                    setDetailError(err?.response?.data?.detail || err?.message || 'Failed to load assessment details.');
                }
                if (prevAttempt.status === 'fulfilled') {
                    const a = prevAttempt.value;
                    if (a && (a.status === 'graded' || a.status === 'submitted')) {
                        setPreviousAttempt(a);
                    }
                }
            } finally {
                setIsLoadingDetail(false);
            }
        };
        load();
    }, [exam.id]);

    // Retry handler for when the detail fetch fails
    const retryLoadDetail = React.useCallback(() => {
        setIsLoadingDetail(true);
        setDetailError(null);
        assessmentService.getAssessment(exam.id)
            .then((detail) => setLiveExam(detail as any))
            .catch((err: any) => {
                const msg = err?.response?.data?.detail || err?.message || 'Failed to load assessment details.';
                setDetailError(msg);
            })
            .finally(() => setIsLoadingDetail(false));
    }, [exam.id]);

    React.useEffect(() => {
        loadPublicAttempts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveExam?.id]);

    // ── Derived proctoring values ───────────────────────────────────────────
    const isProctored = !!(liveExam as any)?.is_proctored;
    const tabLimit = Number((liveExam as any)?.proctor_tab_limit ?? 3);

    // ── Camera: start when exam begins and user has consented ───────────────
    React.useEffect(() => {
        if (!isProctored || !hasStarted || !proctorConsented) return;
        let stream: MediaStream | null = null;
        navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
            .then((s) => {
                stream = s;
                cameraStreamRef.current = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play().catch(() => {});
                }
                setCameraActive(true);
            })
            .catch(() => {
                setCameraBlocked(true);
            });
        return () => {
            stream?.getTracks().forEach((t) => t.stop());
            cameraStreamRef.current = null;
            setCameraActive(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProctored, hasStarted, proctorConsented]);

    // ── Tab-switch detection ────────────────────────────────────────────────
    React.useEffect(() => {
        if (!isProctored || !hasStarted || !proctorConsented) return;
        const onVisibility = () => {
            if (!document.hidden) return;
            setTabSwitchCount((prev) => {
                const next = prev + 1;
                if (next >= tabLimit) {
                    // Force the QuizView to submit by switching to an auto-submit sentinel
                    setTabSwitchCount(tabLimit);
                }
                return next;
            });
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProctored, hasStarted, proctorConsented, tabLimit]);

    // ── Camera cleanup on unmount ───────────────────────────────────────────
    React.useEffect(() => {
        return () => {
            cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

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
            toast.success('Joined challenge successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to join challenge');
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

    const handleProctoredToggle = async (enabled: boolean) => {
        setIsProctoredSaving(true);
        try {
            const updated = await assessmentService.updateAssessment(liveExam.id, { is_proctored: enabled } as any);
            setLiveExam(updated as any);
        } catch (e) {
            console.error('Failed to update proctoring setting', e);
        } finally {
            setIsProctoredSaving(false);
        }
    };

    const handleTabLimitChange = async (limit: number) => {
        try {
            const updated = await assessmentService.updateAssessment(liveExam.id, { proctor_tab_limit: limit } as any);
            setLiveExam(updated as any);
        } catch (e) {
            console.error('Failed to update tab limit', e);
        }
    };

    const handleStartWithProctoring = () => {
        if (isProctored && !proctorConsented) {
            setShowProctorConsent(true);
        } else {
            setHasStarted(true);
            if (isProctored) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            }
        }
    };

    const handleReviewResults = () => {
        setQuizMode('review');
        setHasStarted(true);
    };

    const handleRetake = async () => {
        setIsStartingRetake(true);
        try {
            // Create a new IN_PROGRESS attempt on the server BEFORE rendering QuizView.
            // This ensures getMyAttempt returns the fresh attempt, not the old graded one.
            await assessmentService.startAssessment(liveExam.id);
        } catch { /* ignore — QuizView will retry */ }
        setIsStartingRetake(false);
        setQuizMode('retake');
        setHasStarted(true);
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

    // ── Derived helpers ──────────────────────────────────────────────────────
    const assessmentType: 'quiz' | 'exam' = liveExam?.assessment_type === 'quiz' ? 'quiz' : 'exam';
    const typeLabel = assessmentType === 'quiz' ? 'QUIZ' : 'EXAM';

    // Detect AI-graded question types from the live exam questions.
    const rawQuestions = liveExam?.questions;
    const questionsArray = Array.isArray(rawQuestions) ? rawQuestions : [];

    const hasAiGradedQuestions = questionsArray.some(
        (q: any) =>
            q.question_type === 'essay' ||
            (q.question_type === 'short_answer' && (q.explanation || '').trim().length > 0)
    );
    const hasObjectiveQuestions = questionsArray.some(
        (q: any) => q.question_type === 'mcq' || q.question_type === 'true_false'
    );
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
            {/* ── Proctoring consent modal ─────────────────────────────────── */}
            {showProctorConsent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-7">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🔒</span>
                            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">This exam is monitored</h2>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                            To maintain integrity, this exam requires the following during the session:
                        </p>
                        <ul className="space-y-2 mb-6">
                            <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                                Your <strong>camera must be active</strong> throughout the exam
                            </li>
                            <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                                You must <strong>stay on this tab</strong> — up to {tabLimit} tab switches are allowed before auto-submit
                            </li>
                            <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                                <strong>Fullscreen mode</strong> is recommended for a distraction-free experience
                            </li>
                        </ul>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowProctorConsent(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowProctorConsent(false);
                                    setProctorConsented(true);
                                    setHasStarted(true);
                                    document.documentElement.requestFullscreen?.().catch(() => {});
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors shadow-lg"
                            >
                                I understand — Start Exam
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                Edit {typeLabel === 'QUIZ' ? 'Quiz' : 'Exam'}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Delete "${liveExam.title}"? This cannot be undone.`)) return;
                                    try {
                                        await assessmentService.deleteAssessment(liveExam.id);
                                        setView('assessments');
                                    } catch (e) {
                                        console.error(e);
                                        toast.error('Failed to delete. You may not have permission.');
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
                    {/* Large type badge + title */}
                    <div className="flex items-start gap-3 flex-wrap mb-2">
                        {assessmentType === 'exam' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-extrabold uppercase tracking-widest border-2 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 shadow-sm flex-shrink-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                                EXAM
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-extrabold uppercase tracking-widest border-2 border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200 shadow-sm flex-shrink-0">
                                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                                QUIZ
                            </span>
                        )}
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{liveExam.title}</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{liveExam.description}</p>

                    {/* AI grading notice — shown before starting */}
                    {hasAiGradedQuestions && !hasStarted && (
                        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                            <SparklesIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-violet-800 dark:text-violet-200">
                                This {assessmentType === 'quiz' ? 'quiz' : 'exam'} includes <strong>AI-graded questions</strong> (essay or written responses).
                                Results will be available shortly after submission while AI grades your written answers.
                            </p>
                        </div>
                    )}

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
                        ) : detailError ? (
                            /* Server error — show retry, don't blank the screen */
                            <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                                <span className="text-4xl">⚠️</span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Couldn't load questions</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-xs">{detailError}</p>
                                    <button
                                        onClick={retryLoadDetail}
                                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow"
                                    >
                                        🔄 Retry
                                    </button>
                                </div>
                            </div>
                        ) : quizData.length > 0 && !hasStarted ? (
                            <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
                                <div className="text-center max-w-lg">
                                    {/* Big type pill */}
                                    {assessmentType === 'exam' ? (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-extrabold uppercase tracking-widest border-2 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 mb-4">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            EXAM
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-extrabold uppercase tracking-widest border-2 border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200 mb-4">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            QUIZ
                                        </span>
                                    )}
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                                        Ready to begin?
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                                        {quizData.length} question{quizData.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {liveExam.time || liveExam.time_limit_minutes || 30} minute time limit
                                    </p>
                                    {/* Question type breakdown */}
                                    <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
                                        {hasObjectiveQuestions && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                Auto-graded
                                            </span>
                                        )}
                                        {hasAiGradedQuestions && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                                <SparklesIcon className="w-3 h-3" />
                                                AI-graded questions
                                            </span>
                                        )}
                                    </div>
                                    {isProctored && (
                                        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-medium">
                                            <span className="text-base">🔒</span>
                                            This exam is monitored — camera &amp; tab-switch detection active
                                        </div>
                                    )}

                                    {/* Previous attempt banner */}
                                    {previousAttempt && (
                                        <div className="mb-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm">
                                            <p className="font-semibold text-indigo-800 dark:text-indigo-200 mb-1">
                                                You already completed this {assessmentType === 'quiz' ? 'quiz' : 'exam'}
                                                {previousAttempt.percentage != null ? ` — ${Math.round(Number(previousAttempt.percentage))}%` : ''}
                                            </p>
                                            <div className="flex flex-wrap gap-3 mt-3">
                                                <button
                                                    onClick={handleReviewResults}
                                                    className="px-5 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                                                >
                                                    📋 Review My Results
                                                </button>
                                                <button
                                                    onClick={handleRetake}
                                                    disabled={isStartingRetake}
                                                    className={`px-5 py-2 rounded-xl font-bold text-sm text-white transition shadow ${
                                                        assessmentType === 'exam'
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                                    } disabled:opacity-60`}
                                                >
                                                    {isStartingRetake ? 'Starting…' : `🔄 Retake ${assessmentType === 'quiz' ? 'Quiz' : 'Exam'}`}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* First-time start button */}
                                    {!previousAttempt && (
                                        <button
                                            onClick={handleStartWithProctoring}
                                            className={`px-8 py-3 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg text-white ${
                                                assessmentType === 'exam'
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25'
                                            }`}
                                        >
                                            {assessmentType === 'quiz' ? 'Start Quiz' : 'Start Exam'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : quizData.length > 0 ? (
                            <div className="flex flex-col h-full min-h-0">
                                {/* Tab-switch violation banner */}
                                {isProctored && tabSwitchCount > 0 && tabSwitchCount < tabLimit && (
                                    <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
                                        <span className="text-lg">⚠️</span>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                            Tab switch detected ({tabSwitchCount}/{tabLimit - 1} warnings).
                                            {tabSwitchCount >= tabLimit - 1
                                                ? ' One more will auto-submit your exam!'
                                                : ' Please stay on this tab.'}
                                        </p>
                                    </div>
                                )}
                                {isProctored && tabSwitchCount >= tabLimit && (
                                    <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-rose-50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-800">
                                        <span className="text-lg">🚫</span>
                                        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                                            Tab limit exceeded — your exam has been submitted automatically.
                                        </p>
                                    </div>
                                )}
                                <div className="flex-1 min-h-0">
                                    <QuizView
                                        quiz={quizData as Question[]}
                                        timeLimitMinutes={liveExam.time || liveExam.time_limit_minutes || 30}
                                        assessmentId={liveExam.id}
                                        imageUploadGraceMinutes={imageUploadGraceMinutes}
                                        forceSubmit={isProctored && tabSwitchCount >= tabLimit}
                                        reviewMode={quizMode === 'review'}
                                        initialAnswers={quizMode === 'review' ? (previousAttempt?.answers as Record<string, any> | undefined) : undefined}
                                        previousAttempt={quizMode === 'review' ? previousAttempt ?? undefined : undefined}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                No questions found for this assessment.
                            </div>
                        )}
                    </div>
                    {/* ── Right sidebar — always visible ───────────────────── */}
                    <div className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">

                        {isCreator ? (
                            /* ── CREATOR SIDEBAR ── */
                            <>
                                {/* 3-tab toggle */}
                                <div className="flex-shrink-0 flex gap-1 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                    {(['grading', 'analytics', 'proctor'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => {
                                                setSidebarTab(tab);
                                                if (tab === 'analytics' && attempts.length === 0 && !isLoadingAttempts) loadAttempts();
                                                if (tab === 'grading' && attempts.length === 0 && !isLoadingAttempts) loadAttempts();
                                            }}
                                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${sidebarTab === tab
                                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            {tab === 'grading' ? 'Grading' : tab === 'analytics' ? '📊 Analytics' : '🔒 Proctor'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    {/* ── Analytics tab ── */}
                                    {sidebarTab === 'analytics' && (
                                        <AssessmentAnalytics attempts={attempts} questions={questionsArray} isLoading={isLoadingAttempts} />
                                    )}

                                    {/* ── Grading tab ── */}
                                    {sidebarTab === 'grading' && (<>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Creator Tools</h3>
                                            <button onClick={loadAttempts} className="text-xs px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">Refresh</button>
                                        </div>
                                        {inviteLink && (
                                            <div className="mb-4">
                                                <p className="text-xs text-slate-500 mb-1">Invite link (grading access)</p>
                                                <div className="flex gap-2">
                                                    <input value={inviteLink} readOnly className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                                                    <button onClick={handleCopyInvite} className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 whitespace-nowrap">
                                                        {copyState === 'copied' ? '✓ Copied' : copyState === 'error' ? 'Failed' : 'Copy'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-500 mb-1">Result visibility</p>
                                            <select value={liveExam.results_visibility || 'opt_in_public'} onChange={(e) => handlePolicyChange(e.target.value as any)} className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                                <option value="private">Instructor only</option>
                                                <option value="opt_in_public">Students choose</option>
                                                <option value="public">Always public</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 mb-4">
                                            <button onClick={handleExport} className="flex-1 px-2 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">CSV</button>
                                            <button onClick={handleExportPDF} className="flex-1 px-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">PDF</button>
                                        </div>
                                        {isLoadingAttempts ? (
                                            <p className="text-xs text-slate-500">Loading attempts...</p>
                                        ) : attempts.length === 0 ? (
                                            <p className="text-xs text-slate-500">No attempts yet. Click Refresh.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {attempts.map((attempt) => (
                                                    <div key={attempt.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="font-semibold text-xs">{attempt.user?.username || attempt.user_username || 'Student'}</p>
                                                                <p className="text-[10px] text-slate-500">Score: {attempt.score || '-'} · {attempt.status}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            <input placeholder="Score (8/10)" value={gradingMap[attempt.id]?.score || ''} onChange={(e) => setGradingMap(prev => ({ ...prev, [attempt.id]: { score: e.target.value, percentage: prev[attempt.id]?.percentage || '' } }))} className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                                                            <input placeholder="%" value={gradingMap[attempt.id]?.percentage || ''} onChange={(e) => setGradingMap(prev => ({ ...prev, [attempt.id]: { score: prev[attempt.id]?.score || '', percentage: e.target.value } }))} className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                                                        </div>
                                                        {Array.isArray(attempt.answer_images) && attempt.answer_images.length > 0 && (
                                                            <div className="mb-2 grid grid-cols-2 gap-1">
                                                                {attempt.answer_images.map((img) => (
                                                                    <a key={img.id} href={img.image} target="_blank" rel="noreferrer" className="block rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                                        <img src={img.image} alt={`Answer ${img.question_id}`} className="w-full h-16 object-cover" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <button onClick={() => handleManualGrade(attempt.id)} className="w-full px-2 py-1 text-xs rounded bg-indigo-600 text-white">Save Grade</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>)}

                                    {/* ── Proctor tab ── */}
                                    {sidebarTab === 'proctor' && (
                                        <div className="space-y-5">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Exam Proctoring</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">When enabled, learners must keep their camera on and cannot switch tabs freely during the exam.</p>
                                            </div>

                                            {/* Enable toggle */}
                                            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Enable Proctoring</p>
                                                    <p className="text-[10px] text-slate-500">{isProctored ? '🔒 Active — exam is monitored' : 'Off — standard exam'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleProctoredToggle(!isProctored)}
                                                    disabled={isProctoredSaving}
                                                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${isProctored ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isProctored ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Tab limit */}
                                            {isProctored && (
                                                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 space-y-3">
                                                    <div>
                                                        <p className="text-xs font-bold text-rose-800 dark:text-rose-200 mb-1">Tab switches before auto-submit</p>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={10}
                                                                defaultValue={tabLimit}
                                                                onBlur={(e) => handleTabLimitChange(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
                                                                className="w-20 px-2 py-1 text-xs rounded border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-800"
                                                            />
                                                            <span className="text-[10px] text-rose-700 dark:text-rose-300">switches (default: 3)</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-rose-700 dark:text-rose-300 space-y-1">
                                                        <p>✓ Student camera is activated on start</p>
                                                        <p>✓ Tab switches are counted and warned</p>
                                                        <p>✓ Fullscreen is requested on start</p>
                                                        <p>✓ Consent screen shown before exam</p>
                                                    </div>
                                                </div>
                                            )}

                                            {!isProctored && (
                                                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 space-y-1">
                                                    <p>When proctoring is off, students can take the exam freely with no monitoring.</p>
                                                    <p>Enable it above to run official, integrity-verified exams.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Leaderboard at bottom of creator panel */}
                                    {publicAttempts.length > 0 && sidebarTab !== 'analytics' && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrophyIcon className="w-4 h-4 text-amber-500" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Leaderboard</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {publicAttempts.slice().sort((a, b) => (Number(b.percentage) || 0) - (Number(a.percentage) || 0)).slice(0, 5).map((attempt, i) => (
                                                    <div key={`lb-${attempt.id}`} className="flex items-center gap-2 text-xs">
                                                        <span className="w-4 font-black text-slate-400">{i + 1}</span>
                                                        <span className="flex-1 truncate font-medium">{attempt.user?.username || attempt.user_username || 'Student'}</span>
                                                        <span className="font-black text-indigo-600 dark:text-indigo-400">{attempt.percentage ?? 0}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* ── LEARNER SIDEBAR ── */
                            <>
                                {/* Tab toggle: Info + Monitor (if proctored) */}
                                <div className="flex-shrink-0 flex gap-1 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={() => setLearnerTab('info')}
                                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${learnerTab === 'info' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        ℹ️ Info
                                    </button>
                                    {isProctored && (
                                        <button
                                            onClick={() => setLearnerTab('monitor')}
                                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${learnerTab === 'monitor' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            📷 Monitor
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    {/* ── Info tab ── */}
                                    {learnerTab === 'info' && (
                                        <div className="space-y-4">
                                            {/* Assessment quick-stats */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-center">
                                                    <p className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300">{questionsArray.length}</p>
                                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Questions</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-center">
                                                    <p className="text-lg font-extrabold text-violet-700 dark:text-violet-300">{liveExam.time || liveExam.time_limit_minutes || 30}m</p>
                                                    <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Time Limit</p>
                                                </div>
                                            </div>

                                            {/* Question type breakdown */}
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Question Types</p>
                                                {hasObjectiveQuestions && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                                        <span className="text-slate-600 dark:text-slate-300">Auto-graded (MCQ / True-False)</span>
                                                    </div>
                                                )}
                                                {hasAiGradedQuestions && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                                                        <span className="text-slate-600 dark:text-slate-300">AI-graded (Essay / Written)</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Proctoring notice */}
                                            {isProctored && (
                                                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                                    <span className="text-sm flex-shrink-0">🔒</span>
                                                    <div className="text-[10px] text-rose-800 dark:text-rose-200 space-y-0.5">
                                                        <p className="font-bold">Monitored Exam</p>
                                                        <p>Camera required · Max {tabLimit} tab switches</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instructions */}
                                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-[10px] text-amber-800 dark:text-amber-200 space-y-1">
                                                <p className="font-bold text-xs">📋 Instructions</p>
                                                <p>• Do not refresh the page — your progress is auto-saved</p>
                                                <p>• Submit before the timer runs out</p>
                                                {hasAiGradedQuestions && <p>• AI-graded results may take a moment after submission</p>}
                                                {isProctored && <p>• Stay on this tab — switches are monitored</p>}
                                            </div>

                                            {/* Result visibility toggle */}
                                            {(liveExam.results_visibility || 'opt_in_public') === 'opt_in_public' && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">My Result Visibility</p>
                                                    <div className="flex gap-2">
                                                        <select value={myResultPublic ? 'public' : 'private'} onChange={(e) => setMyResultPublic(e.target.value === 'public')} className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                                            <option value="private">Private</option>
                                                            <option value="public">Public (leaderboard)</option>
                                                        </select>
                                                        <button onClick={handleResultVisibilitySave} disabled={isSavingVisibility} className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white">
                                                            {isSavingVisibility ? '...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Leaderboard */}
                                            {publicAttempts.length > 0 && (
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <TrophyIcon className="w-4 h-4 text-amber-500" />
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Leaderboard</h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {publicAttempts.slice().sort((a, b) => {
                                                            const pA = Number(a.percentage || 0), pB = Number(b.percentage || 0);
                                                            if (pB !== pA) return pB - pA;
                                                            return (a.time_taken_seconds || 999999) - (b.time_taken_seconds || 999999);
                                                        }).map((attempt, i) => {
                                                            const mins = Math.floor((attempt.time_taken_seconds || 0) / 60);
                                                            const secs = (attempt.time_taken_seconds || 0) % 60;
                                                            const isMe = attempt.user?.username === user?.username;
                                                            return (
                                                                <div key={`lb-${attempt.id}`} className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${isMe ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                                                                    <span className="w-4 font-black text-slate-400">{i + 1}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold truncate">{attempt.user?.username || attempt.user_username || 'Student'}{isMe ? ' (you)' : ''}</p>
                                                                        <p className="text-[10px] text-slate-400"><ClockIcon className="w-2.5 h-2.5 inline mr-0.5" />{attempt.time_taken_seconds ? `${mins}m ${secs}s` : '---'}</p>
                                                                    </div>
                                                                    <span className="font-black text-indigo-600 dark:text-indigo-400">{attempt.percentage ?? 0}%</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {publicAttempts.length === 0 && (
                                                <div className="text-center py-4">
                                                    <TrophyIcon className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                                                    <p className="text-[10px] text-slate-400">No public results yet</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Monitor tab ── */}
                                    {learnerTab === 'monitor' && isProctored && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    {cameraActive ? 'Camera Active — You are being monitored' : cameraBlocked ? 'Camera blocked' : 'Camera inactive'}
                                                </p>
                                            </div>

                                            {/* Camera preview */}
                                            <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video flex items-center justify-center">
                                                {cameraBlocked ? (
                                                    <div className="text-center p-4">
                                                        <p className="text-2xl mb-2">🚫</p>
                                                        <p className="text-xs text-rose-400 font-semibold">Camera access denied</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">Allow camera in your browser and reload</p>
                                                    </div>
                                                ) : (
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        muted
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                        style={{ transform: 'scaleX(-1)' }}
                                                    />
                                                )}
                                            </div>

                                            {/* Tab switch counter */}
                                            <div className={`p-3 rounded-xl border text-xs font-medium ${tabSwitchCount === 0 ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200' : tabSwitchCount >= tabLimit - 1 ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
                                                <p className="font-bold mb-0.5">Tab Switches: {tabSwitchCount} / {tabLimit}</p>
                                                <p className="text-[10px] opacity-80">
                                                    {tabSwitchCount === 0 ? 'No violations — good work!' : `${tabLimit - tabSwitchCount} remaining before auto-submit`}
                                                </p>
                                            </div>

                                            <p className="text-[10px] text-slate-400 text-center">Stay on this tab to avoid violations</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
