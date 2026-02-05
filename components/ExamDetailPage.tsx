import React from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { View } from '../App';
import type { Assessment, Question } from '../types';
import { QuizView } from './QuizView';
import { assessmentService, AssessmentAttempt } from '../src/services/assessmentService';
import { useAuth } from '../src/contexts/AuthContext';

interface ExamDetailPageProps {
    exam: Assessment;
    setView: (view: View) => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({ exam, setView }) => {
    const { user } = useAuth();
    const shareToken = exam.share_token;
    const isCreator = !!(user && exam.creator && user.id === exam.creator.id);
    const inviteLink = shareToken ? `${window.location.origin}/?assessment=${exam.id}&share_token=${shareToken}` : '';

    const [attempts, setAttempts] = React.useState<AssessmentAttempt[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = React.useState(false);
    const [gradingMap, setGradingMap] = React.useState<Record<number, { score: string; percentage: string }>>({});
    const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle');

    const loadAttempts = async () => {
        if (!isCreator && !shareToken) return;
        setIsLoadingAttempts(true);
        try {
            const data = await assessmentService.getAttempts(exam.id, shareToken);
            setAttempts(data);
        } finally {
            setIsLoadingAttempts(false);
        }
    };

    const handleExport = async () => {
        const blob = await assessmentService.exportAttempts(exam.id, shareToken);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment_${exam.id}_attempts.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportPDF = async () => {
        const blob = await assessmentService.exportAttemptsPDF(exam.id, shareToken);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment_${exam.id}_attempts.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleJoinChallenge = async () => {
        try {
            await assessmentService.joinChallenge(exam.id);
            alert('Joined challenge successfully!');
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to join challenge');
        }
    };

    const handleManualGrade = async (attemptId: number) => {
        const entry = gradingMap[attemptId];
        if (!entry?.score || !entry?.percentage) return;
        const percentage = Number(entry.percentage);
        await assessmentService.manualGrade(exam.id, {
            attempt_id: attemptId,
            score: entry.score,
            percentage: isNaN(percentage) ? 0 : percentage,
        }, shareToken);
        await loadAttempts();
    };

    const handleCopyInvite = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch (error) {
            console.error('Failed to copy invite link', error);
            setCopyState('error');
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
                    {!isCreator && (
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
                        {quizData.length > 0 ? (
                            <QuizView quiz={quizData as Question[]} timeLimitMinutes={exam.time} assessmentId={exam.id} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                No questions found for this assessment.
                            </div>
                        )}
                    </div>
                    {(isCreator || shareToken) && (
                        <div className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Creator Tools</h3>
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
                                <p className="text-sm text-slate-500">No attempts yet.</p>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
