import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import MathMarkdown from './MathMarkdown';
import { aiClient } from '../src/services/api';
import { assessmentService, type QuestionResult } from '../src/services/assessmentService';
import type {
  Question,
  QuizQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
  PassageQuestion,
  ClozeQuestion
} from '../types';
import { Button } from './ui/Button';

// Robustly parse an AI grading response that may contain LaTeX {} braces
// inside the feedback string, which breaks greedy regex matching.
function parseGradingResponse(text: string): { score: number; feedback: string } {
  // 1. Try direct parse first (model returned clean JSON)
  try { return JSON.parse(text); } catch { /* fall through */ }
  // 2. Extract score and feedback individually using targeted patterns
  const scoreMatch = text.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);
  const feedbackMatch = text.match(/"feedback"\s*:\s*"([\s\S]*?)"\s*[,}]/);
  if (scoreMatch) {
    const score = Math.min(100, Math.max(0, parseFloat(scoreMatch[1])));
    const feedback = feedbackMatch
      ? feedbackMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      : text;
    return { score, feedback };
  }
  // 3. Fallback — score 0 so a bad answer never gets free points
  return { score: 0, feedback: text };
}

interface QuizViewProps {
  quiz: QuizQuestion[] | Question[] | null;
  timeLimitMinutes?: number;
  assessmentId?: number;
  imageUploadGraceMinutes?: number;
  forceSubmit?: boolean;
  contestMode?: boolean;
  /** If true, start in submitted/review state showing previous attempt results. */
  reviewMode?: boolean;
  /** Pre-fill answers from a previous attempt (used with reviewMode). */
  initialAnswers?: Record<string, any>;
  /** Full previous attempt data (used with reviewMode for scores/grading). */
  previousAttempt?: import('../src/services/assessmentService').AssessmentAttempt;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quiz,
  timeLimitMinutes,
  assessmentId,
  imageUploadGraceMinutes,
  forceSubmit,
  contestMode = false,
  reviewMode = false,
  initialAnswers,
  previousAttempt,
}) => {
  const questions: Question[] = useMemo(() => {
    if (!quiz || !Array.isArray(quiz)) return [];

    const letterToIndex = (letter: string): number => {
      const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      return map[letter?.trim()] ?? -1;
    };

    return quiz.map((q: any, idx) => {
      if (q.type && q.id) return q as Question;

      const baseId = `ai-${idx}-${Date.now()}`;
      const options = q.options ?? q.choices ?? [];
      const correctAnswer = q.correctAnswer ?? q.correct_answer;

      if (q.question && options.length === 0 && !correctAnswer) {
        return {
          id: baseId, type: 'essay', points: 10,
          question_text: q.question, max_words: 500,
          rubric_criteria: q.rubric_criteria || [],
          model_solution: q.model_solution, ai_grading_enabled: true
        } as EssayQuestion;
      }
      if (q.question && correctAnswer && options.length === 0) {
        return {
          id: baseId, type: 'short_answer', points: 5,
          question_text: q.question, correct_answers: [correctAnswer],
          case_sensitive: false, exact_match: false, max_length: 100
        } as ShortAnswerQuestion;
      }
      if (options.length === 0) {
        return {
          id: baseId, type: 'short_answer',
          question_text: q.question || q.question_text || 'Untitled Question',
          correct_answers: correctAnswer ? [correctAnswer] : [],
          case_sensitive: false, exact_match: false, max_length: 200,
          points: q.points || 1, explanation: q.explanation,
        } as ShortAnswerQuestion;
      }

      let correctIndex = typeof q.correct_answer_index === 'number' ? q.correct_answer_index : -1;
      if (correctIndex < 0 && correctAnswer && options.length > 0) {
        correctIndex = options.indexOf(correctAnswer);
        if (correctIndex < 0) correctIndex = letterToIndex(correctAnswer);
        if (correctIndex < 0) {
          const lowerAnswer = String(correctAnswer).toLowerCase();
          correctIndex = options.findIndex((o: string) => o.toLowerCase() === lowerAnswer);
        }
      }
      return {
        id: baseId, type: 'multiple_choice',
        question_text: q.question || q.question_text || 'Untitled Question',
        options, correct_answer_index: correctIndex >= 0 ? correctIndex : 0,
        points: q.points || 1, explanation: q.explanation, source_url: q.source_url,
      } as MultipleChoiceQuestion;
    });
  }, [quiz]);

  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers ?? {});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(reviewMode);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(
    timeLimitMinutes ? Math.max(0, Math.round(timeLimitMinutes * 60)) : null
  );
  const [attemptStatusFromServer, setAttemptStatusFromServer] = useState<string | null>(
    reviewMode && previousAttempt ? (previousAttempt.status ?? null) : null
  );
  const [serverAttempt, setServerAttempt] = useState<{ status?: string; score?: string | number; percentage?: number; question_results?: Record<string, QuestionResult> } | null>(
    reviewMode && previousAttempt
      ? { status: previousAttempt.status, score: previousAttempt.score, percentage: previousAttempt.percentage, question_results: previousAttempt.question_results }
      : null
  );
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState('');
  const [gradingResults, setGradingResults] = useState<Record<string, { score: number, feedback: string }>>({});
  const [isGrading, setIsGrading] = useState<Record<string, boolean>>({});
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const [uploadedImages, setUploadedImages] = useState<Record<string, boolean>>({});
  const [attemptReady, setAttemptReady] = useState(false);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [imageUploadSecondsLeft, setImageUploadSecondsLeft] = useState<number | null>(null);

  // Contest mode
  const [tabSwitches, setTabSwitches] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const tabEventsRef = useRef<{ time: string; count: number }[]>([]);

  // Easy mode: per-question grade reveal
  const [easyMode, setEasyMode] = useState(false);
  const [easyGraded, setEasyGraded] = useState<Set<string>>(new Set());
  const [easyGrading, setEasyGrading] = useState<Record<string, boolean>>({});
  // Easy mode: "Show Answer" without grading (student skipped)
  const [shownAnswers, setShownAnswers] = useState<Set<string>>(new Set());

  const handleShowAnswer = (qId: string) => {
    setShownAnswers(prev => new Set(prev).add(qId));
  };

  // Contest mode: track tab visibility changes
  useEffect(() => {
    if (!contestMode || isSubmitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1;
          tabEventsRef.current.push({ time: new Date().toISOString(), count: next });
          if (next >= 1) setTabWarning(true);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [contestMode, isSubmitted]);

  // Auto-submit when proctor forces it
  useEffect(() => {
    if (forceSubmit && !isSubmitted && !isSubmittingAttempt) {
      submitAttempt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSubmit]);

  const ensureAttemptStarted = async () => {
    if (!assessmentId || attemptReady) return;
    await assessmentService.startAssessment(assessmentId);
    setAttemptReady(true);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleUploadImage = async (questionId: string, file: File) => {
    if (!assessmentId) return;
    setUploadingImages(prev => ({ ...prev, [questionId]: true }));
    try {
      await ensureAttemptStarted();
      await assessmentService.uploadAnswerImage(assessmentId, questionId, file);
      setUploadedImages(prev => ({ ...prev, [questionId]: true }));
    } catch (error) {
      // silently fail — user can retry
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const submitAttempt = async () => {
    if (!assessmentId) {
      setIsSubmitted(true);
      return;
    }

    setSubmitError('');
    setIsSubmittingAttempt(true);
    setMarkError('');
    try {
      await ensureAttemptStarted();
      const data = await assessmentService.submitAssessment(assessmentId, answers as Record<number, string>);
      setAttemptStatusFromServer(data?.status ?? null);
      if (data?.status === 'graded') {
        setServerAttempt({ status: data.status, score: data.score, percentage: data.percentage, question_results: data.question_results });
      } else {
        // status === 'submitted' — wait for user to explicitly click "Grade with AI"
        setServerAttempt(null);
      }
      setIsSubmitted(true);
      if (imageUploadGraceMinutes && imageUploadGraceMinutes > 0) {
        setImageUploadSecondsLeft(Math.max(0, Math.round(imageUploadGraceMinutes * 60)));
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail || 'Failed to submit to server. Please retry.';
      setSubmitError(detail);
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const handleMarkWithAI = async () => {
    if (!assessmentId) return;
    setIsMarking(true);
    setMarkError('');
    try {
      await assessmentService.runGrading(assessmentId);
      const pollInterval = 2000;
      const maxPolls = 90;
      let polls = 0;
      const poll = async (): Promise<void> => {
        const attempt = await assessmentService.getMyAttempt(assessmentId);
        if (attempt?.status === 'graded') {
          setServerAttempt({ status: attempt.status, score: attempt.score, percentage: attempt.percentage, question_results: attempt.question_results });
          setAttemptStatusFromServer('graded');
          setIsMarking(false);
          return;
        }
        polls++;
        if (polls >= maxPolls) {
          setMarkError('Marking is taking longer than expected. Refresh the page to check your result.');
          setIsMarking(false);
          return;
        }
        setTimeout(poll, pollInterval);
      };
      setTimeout(poll, pollInterval);
    } catch (err: any) {
      setMarkError(err?.response?.data?.detail || err?.message || 'Failed to start marking.');
      setIsMarking(false);
    }
  };

  useEffect(() => {
    if (!assessmentId || reviewMode) return;
    ensureAttemptStarted().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, reviewMode]);

  // On page load: check if there's already a submitted/graded attempt (skip in review mode — data already passed via props)
  useEffect(() => {
    if (!assessmentId || reviewMode) return;
    assessmentService.getMyAttempt(assessmentId).then((attempt) => {
      if (!attempt) return;
      if (attempt.status === 'graded') {
        setServerAttempt({ status: attempt.status, score: attempt.score, percentage: attempt.percentage, question_results: attempt.question_results });
        setAttemptStatusFromServer('graded');
        setIsSubmitted(true);
        return;
      }
      if (attempt.status === 'submitted') {
        setAttemptStatusFromServer('submitted');
        setIsSubmitted(true);
      }
    }).catch(() => {});
  }, [assessmentId, reviewMode]);

  useEffect(() => {
    if (!timeLimitMinutes || isSubmitted) return;
    setTimeLeftSeconds(Math.max(0, Math.round(timeLimitMinutes * 60)));
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          submitAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitMinutes, isSubmitted]);

  useEffect(() => {
    if (!isSubmitted || !imageUploadGraceMinutes || imageUploadGraceMinutes <= 0) return;
    if (imageUploadSecondsLeft === null) {
      setImageUploadSecondsLeft(Math.max(0, Math.round(imageUploadGraceMinutes * 60)));
      return;
    }
    if (imageUploadSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setImageUploadSecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, imageUploadGraceMinutes, imageUploadSecondsLeft]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGradeEssay = async (q: EssayQuestion) => {
    const studentAnswer = answers[q.id];
    if (!studentAnswer || !studentAnswer.trim()) return;
    setIsGrading(prev => ({ ...prev, [q.id]: true }));
    try {
      const gradePrompt = `You are an expert educator. Grade the following student essay response.

Question: ${q.question_text}

Model Solution/Expected Answer: ${q.model_solution || "No model solution provided."}

Student Answer: ${studentAnswer}

Provide a JSON response with:
- score (0-100)
- feedback (detailed markdown-formatted feedback on what was good and what could improve)

Format: {"score": number, "feedback": "string"}`;

      const response = await aiClient.post('/ai/chat/', {
        message: gradePrompt,
        context: q.question_text
      });
      const responseText = response.data.response || response.data;
      const result = parseGradingResponse(responseText);
      setGradingResults(prev => ({ ...prev, [q.id]: result }));
    } catch {
      setGradingResults(prev => ({ ...prev, [q.id]: { score: 0, feedback: 'Error grading essay. Please try again.' } }));
    }
    setIsGrading(prev => ({ ...prev, [q.id]: false }));
  };

  const handleGradeAllEssays = async () => {
    const essayQuestions = questions.filter(q => q.type === 'essay') as EssayQuestion[];
    for (const q of essayQuestions) {
      if (answers[q.id]?.trim()) {
        await handleGradeEssay(q);
      }
    }
  };

  const handleEasyGradeQuestion = async (q: Question) => {
    const qId = String(q.id);
    if (q.type === 'essay') {
      setEasyGrading(prev => ({ ...prev, [qId]: true }));
      try {
        await handleGradeEssay(q as EssayQuestion);
      } finally {
        setEasyGrading(prev => ({ ...prev, [qId]: false }));
      }
    } else if (q.type === 'short_answer') {
      const studentAnswer = answers[qId];
      if (studentAnswer?.trim()) {
        setEasyGrading(prev => ({ ...prev, [qId]: true }));
        const sq = q as ShortAnswerQuestion;
        try {
          const gradePrompt = `You are a helpful teacher. A student answered a short-answer question.

Question: ${sq.question_text}
Expected answers: ${sq.correct_answers?.join(' / ') || 'Open-ended'}
Student's answer: ${studentAnswer}

Reply with JSON: {"score": 0-100, "feedback": "1-2 sentence feedback"}`;
          const response = await aiClient.post('/ai/chat/', { message: gradePrompt, context: sq.question_text });
          const text = response.data.response || '';
          const result = parseGradingResponse(text);
          setGradingResults(prev => ({ ...prev, [qId]: result }));
        } catch {
          setGradingResults(prev => ({ ...prev, [qId]: { score: 0, feedback: 'Could not connect. Try again.' } }));
        } finally {
          setEasyGrading(prev => ({ ...prev, [qId]: false }));
        }
      }
    }
    // Reveal correct answer and explanation for all types
    setEasyGraded(prev => new Set([...prev, qId]));
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;
    questions.forEach(q => {
      if (!q.type) return;
      if (q.type === 'passage') {
        q.questions.forEach(subQ => {
          totalPoints += subQ.points;
          const userAns = answers[`${q.id}-${subQ.id}`];
          if (subQ.question_type === 'multiple_choice' && userAns === subQ.options?.[subQ.correct_answer as number]) {
            earnedPoints += subQ.points;
          } else if (subQ.correct_answer === userAns) {
            earnedPoints += subQ.points;
          }
        });
      } else {
        totalPoints += q.points;
        if (q.type === 'multiple_choice') {
          if (answers[q.id] === q.options[q.correct_answer_index]) earnedPoints += q.points;
        } else if (q.type === 'true_false') {
          if (answers[q.id] === q.correct_answer) earnedPoints += q.points;
        } else if (q.type === 'short_answer') {
          const userText = (answers[q.id] || '').trim();
          const isCorrect = q.correct_answers.some(ans =>
            q.case_sensitive ? ans === userText : ans.toLowerCase() === userText.toLowerCase()
          );
          if (isCorrect) earnedPoints += q.points;
        } else if (q.type === 'cloze') {
          const parts: string[] = q.question_text?.match(/\[(.*?)\]/g) || [];
          let correctBlanks = 0;
          parts.forEach((part, idx) => {
            const expected = part.slice(1, -1);
            const userVal = answers[`${q.id}-${idx}`] || '';
            if (userVal.toLowerCase().trim() === expected.toLowerCase().trim()) correctBlanks++;
          });
          if (parts.length > 0) earnedPoints += (correctBlanks / parts.length) * q.points;
        } else if (q.type === 'essay') {
          if (gradingResults[q.id]) {
            earnedPoints += (gradingResults[q.id].score / 100) * q.points;
          }
        }
      }
    });
    return { earned: Math.round(earnedPoints * 10) / 10, total: totalPoints };
  };

  const results = isSubmitted ? calculateScore() : { earned: 0, total: 0 };
  const hasLocalGrades = Object.keys(gradingResults).length > 0;
  const isFullyGraded = serverAttempt?.status === 'graded';
  // showResults: in practice mode (no server), reveal immediately; otherwise only after AI grading
  const showResults = isFullyGraded || !assessmentId;

  if (questions.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">No questions available.</p>
      </div>
    );
  }

  const renderCloze = (q: ClozeQuestion) => {
    if (!q.question_text) return null;
    const parts = q.question_text.split(/(\[.*?\])/g);
    let blankIndex = 0;
    return (
      <div className="leading-relaxed text-lg flex flex-wrap items-center">
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const currentBlankIdx = blankIndex++;
            const answerKey = `${q.id}-${currentBlankIdx}`;
            const val = answers[answerKey] || '';
            const expected = part.slice(1, -1);
            const isCorrect = showResults && val.toLowerCase().trim() === expected.toLowerCase().trim();
            return (
              <span key={i} className="mx-1 inline-block relative">
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={val}
                  onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                  className={`w-32 px-2 py-1 border-b-2 text-center font-medium outline-none transition-colors ${isSubmitted
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-rose-500 bg-rose-50 text-rose-800'
                    : 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-200'
                  }`}
                />
                {isSubmitted && !isCorrect && (
                  <span className="absolute -top-6 left-0 text-xs text-emerald-600 font-bold bg-white px-1 rounded shadow">
                    {expected}
                  </span>
                )}
              </span>
            );
          }
          return <MarkdownRenderer key={i} content={part} />;
        })}
      </div>
    );
  };

  const renderPassage = (q: PassageQuestion) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap dark:text-slate-300">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{q.passage_title}</h4>
        <MarkdownRenderer content={q.passage_text} />
      </div>
      <div className="space-y-6">
        {q.questions.map((subQ, idx) => (
          <div key={subQ.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="font-semibold mb-3 dark:text-slate-200">
              <span className="mr-2">{idx + 1}.</span>
              <MarkdownRenderer content={subQ.question_text} />
            </div>
            <div className="space-y-2">
              {subQ.options?.map((opt, optIdx) => {
                const isSelected = answers[`${q.id}-${subQ.id}`] === opt;
                let btnClass = "w-full text-left p-3 rounded-md border border-slate-300 dark:border-slate-600 transition-colors dark:text-slate-300";
                if (isSubmitted) {
                  if (optIdx === subQ.correct_answer) btnClass += " bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
                  else if (isSelected) btnClass += " bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
                } else {
                  if (isSelected) btnClass += " bg-indigo-100 border-indigo-500 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
                  else btnClass += " hover:bg-slate-50 dark:hover:bg-slate-700";
                }
                return (
                  <button key={optIdx} className={btnClass} onClick={() => handleAnswerChange(`${q.id}-${subQ.id}`, opt)} disabled={isSubmitted}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-slate-800">

      {/* Contest mode tab-switch warning overlay */}
      {contestMode && tabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border-2 border-rose-400">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-2">Tab Switch Detected</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              You left this tab during your assessment. This has been recorded.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Tab switches: <span className="font-bold text-rose-600">{tabSwitches}</span>
              {tabSwitches >= 3 && ' — multiple violations flagged for review'}
            </p>
            <Button onClick={() => setTabWarning(false)} className="w-full">
              Return to Assessment
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {/* Review mode banner */}
        {reviewMode && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              📋 Reviewing your previous attempt
              {previousAttempt?.percentage != null ? ` — ${Math.round(Number(previousAttempt.percentage))}%` : ''}
            </span>
          </div>
        )}
        {/* Header row */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Assessment</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Easy Mode toggle */}
            {!isSubmitted && (
              <button
                onClick={() => setEasyMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  easyMode
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Easy Mode
              </button>
            )}
            {/* Contest mode badge */}
            {contestMode && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                tabSwitches > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300'
                  : 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300'
              }`}>
                🔒 Contest Mode{tabSwitches > 0 ? ` · ${tabSwitches} tab switch${tabSwitches !== 1 ? 'es' : ''}` : ''}
              </span>
            )}
            {timeLeftSeconds !== null && !isSubmitted && (
              <div className={`text-sm font-semibold ${timeLeftSeconds < 60 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-rose-600 dark:text-rose-400'}`}>
                Time left: {formatTime(timeLeftSeconds)}
              </div>
            )}
            {isSubmitted && showResults && (
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {isFullyGraded && !hasLocalGrades && (serverAttempt?.score != null || serverAttempt?.percentage != null)
                  ? `Score: ${serverAttempt!.score ?? '—'}${serverAttempt!.percentage != null ? ` (${Math.round(serverAttempt!.percentage)}%)` : ''}`
                  : `Score: ${results.earned} / ${results.total}`}
              </div>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can type answers directly (LaTeX supported) or upload a photo of your written work.
          Submit when done, then click <strong>Mark with AI</strong> to see your results.
        </div>

        {imageUploadGraceMinutes && imageUploadGraceMinutes > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 flex items-center justify-between gap-3">
            <span>
              After you submit, you have{' '}
              <span className="font-semibold">{imageUploadGraceMinutes} minutes</span> to upload answer photos.
            </span>
            {isSubmitted && imageUploadSecondsLeft !== null && (
              <span className="font-semibold text-amber-700">
                Image upload time left: {formatTime(imageUploadSecondsLeft)}
              </span>
            )}
          </div>
        )}

        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {submitError}
          </div>
        )}

        {/* Post-submit grading card */}
        {isSubmitted && !isFullyGraded && assessmentId && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 px-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-200">Assessment Submitted</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Objective answers are scored. Grade written answers with AI below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                onClick={handleMarkWithAI}
                disabled={isMarking}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              >
                {isMarking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI Grading…
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Grade All with AI
                  </>
                )}
              </Button>
              {questions.some(q => q.type === 'essay' && answers[q.id]?.trim()) && (
                <Button
                  onClick={handleGradeAllEssays}
                  disabled={isMarking}
                  variant="secondary"
                  className="gap-2"
                >
                  <SparklesIcon className="w-4 h-4 text-indigo-600" />
                  Grade Essays Individually
                </Button>
              )}
            </div>
            {markError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{markError}</p>}
          </div>
        )}

        {/* Re-grade option when already graded */}
        {isSubmitted && isFullyGraded && assessmentId && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkWithAI}
              disabled={isMarking}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {isMarking ? (
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <SparklesIcon className="w-3.5 h-3.5" />
              )}
              {isMarking ? 'Re-grading…' : 'Re-grade with AI'}
            </button>
            {markError && <span className="text-xs text-rose-600">{markError}</span>}
          </div>
        )}
      </div>

      {/* Question list */}
      <div className="space-y-8 max-w-4xl mx-auto">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            {q.type !== 'passage' && (
              <div className="flex gap-3 mb-4">
                <span className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0 overflow-visible">
                  {q.type !== 'cloze' && (
                    <div className="text-base font-medium text-slate-800 dark:text-slate-100 overflow-visible break-words">
                      {(q as any).images?.length > 0 ? (
                        <MathMarkdown images={(q as any).images}>
                          {q.type === 'essay' ? (q as EssayQuestion).question_text : (q as any).question_text}
                        </MathMarkdown>
                      ) : (
                        <MarkdownRenderer content={q.type === 'essay' ? (q as EssayQuestion).question_text : (q as any).question_text} />
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                      {q.type ? q.type.replace('_', ' ') : 'Question'} • {q.points} pts
                    </span>
                    {serverAttempt?.status === 'graded' && serverAttempt.question_results?.[String(q.id)] && (() => {
                      const qr = serverAttempt.question_results![String(q.id)];
                      const pct = qr.max_score > 0 ? Math.round((qr.score / qr.max_score) * 100) : 0;
                      const color = pct >= 70
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : pct >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
                          {qr.ai_graded && <SparklesIcon className="w-3 h-3" />}
                          {qr.score}/{qr.max_score} pts
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-visible">
              {q.type === 'multiple_choice' && (() => {
                const revealed = showResults || easyGraded.has(String(q.id));
                return (
                  <div className="space-y-2 pl-11 mt-1 min-h-[2rem]" role="listbox" aria-label="Answer options">
                    {(q as MultipleChoiceQuestion).options?.map((opt, i) => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = (q as MultipleChoiceQuestion).correct_answer_index === i;
                      let className = "w-full text-left p-3 rounded-lg border transition-all ";
                      if (revealed) {
                        if (isCorrect) className += "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300";
                        else if (isSelected) className += "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300";
                        else className += "border-slate-200 dark:border-slate-700 text-slate-500 opacity-50";
                      } else {
                        if (isSelected) className += "bg-indigo-50 border-indigo-500 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 shadow-sm";
                        else className += "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300";
                      }
                      return (
                        <button key={i} onClick={() => handleAnswerChange(q.id, opt)} disabled={isSubmitted} className={className}>
                          <div className="flex items-center justify-between">
                            <span><MarkdownRenderer content={opt} /></span>
                            {revealed && isCorrect && <CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
                            {revealed && isSelected && !isCorrect && <XIcon className="w-5 h-5 text-rose-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {q.type === 'true_false' && (() => {
                const revealed = showResults || easyGraded.has(String(q.id));
                return (
                  <div className="flex gap-4 pl-11">
                    {[true, false].map((val) => {
                      const isSelected = answers[q.id] === val;
                      const isCorrect = (q as TrueFalseQuestion).correct_answer === val;
                      return (
                        <button
                          key={String(val)}
                          onClick={() => handleAnswerChange(q.id, val)}
                          disabled={isSubmitted}
                          className={`px-6 py-3 rounded-lg border font-medium transition-all ${revealed
                            ? isCorrect ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : isSelected ? 'bg-rose-100 border-rose-500 text-rose-800' : 'opacity-50'
                            : isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {val ? 'True' : 'False'}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {q.type === 'short_answer' && (
                <div className="pl-11">
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                    disabled={isSubmitted}
                    rows={3}
                    placeholder="Type your answer... (Supports LaTeX: $x^2$)"
                    className="w-full max-w-md p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none overflow-hidden"
                  />
                  {(showResults || easyGraded.has(String(q.id))) && (q as ShortAnswerQuestion).correct_answers?.length > 0 && (
                    <div className="mt-2 text-sm text-slate-500">
                      Correct answers: {(q as ShortAnswerQuestion).correct_answers?.join(', ')}
                    </div>
                  )}
                  {assessmentId && (!imageUploadGraceMinutes || imageUploadSecondsLeft === null || imageUploadSecondsLeft > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Answer with a photo:</span>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(q.id, f); e.currentTarget.value = ''; }} />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">Take photo</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(q.id, f); e.currentTarget.value = ''; }} />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">Upload image</span>
                      </label>
                      {uploadingImages[q.id] && <span>Uploading...</span>}
                      {!uploadingImages[q.id] && uploadedImages[q.id] && <span className="text-emerald-600">Uploaded</span>}
                    </div>
                  )}
                </div>
              )}

              {q.type === 'cloze' && <div className="pl-11">{renderCloze(q as ClozeQuestion)}</div>}
              {q.type === 'passage' && <div>{renderPassage(q as PassageQuestion)}</div>}

              {q.type === 'essay' && (
                <div className="pl-11">
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    disabled={isSubmitted}
                    rows={6}
                    className="w-full p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none font-mono text-sm"
                    placeholder="Write your response here... (Supports LaTeX: $x^2$, $$\\int_0^1 f(x)\\,dx$$)"
                  />
                  {(isSubmitted || easyMode) && !gradingResults[q.id] && !shownAnswers.has(String(q.id)) && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {(answers[q.id]?.trim() || uploadedImages[q.id]) && (
                        <Button onClick={() => handleGradeEssay(q as EssayQuestion)} disabled={isGrading[q.id]} variant="secondary" className="gap-2">
                          {isGrading[q.id] ? (
                            <><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />AI Grading...</>
                          ) : (
                            <><SparklesIcon className="w-4 h-4 text-indigo-600" />Grade with AI</>
                          )}
                        </Button>
                      )}
                      {easyMode && (
                        <button
                          onClick={() => handleShowAnswer(String(q.id))}
                          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors"
                        >
                          Show answer
                        </button>
                      )}
                    </div>
                  )}
                  {gradingResults[q.id] && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <SparklesIcon className="w-4 h-4 text-indigo-500" />
                          AI Feedback
                        </h5>
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-sm">
                          {Math.round((gradingResults[q.id].score / 100) * q.points)} / {q.points} pts
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={gradingResults[q.id].feedback || ''} />
                      </div>
                      {(q as EssayQuestion).model_solution && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-indigo-600 uppercase tracking-wide">
                              Reveal Model Solution
                            </summary>
                            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                              <MarkdownRenderer content={(q as EssayQuestion).model_solution!} />
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  )}
                  {assessmentId && (!imageUploadGraceMinutes || imageUploadSecondsLeft === null || imageUploadSecondsLeft > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Or submit a photo of your answer:</span>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(q.id, f); e.currentTarget.value = ''; }} />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">Take photo</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(q.id, f); e.currentTarget.value = ''; }} />
                        <span className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">Upload image</span>
                      </label>
                      {uploadingImages[q.id] && <span>Uploading...</span>}
                      {!uploadingImages[q.id] && uploadedImages[q.id] && <span className="text-emerald-600">Uploaded</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Easy mode: Grade with AI + Show Answer buttons (for non-essay types) */}
            {easyMode && !isSubmitted && q.type !== 'essay' && !easyGraded.has(String(q.id)) && !shownAnswers.has(String(q.id)) && (
              <div className="mt-4 ml-11 flex items-center gap-3 flex-wrap">
                {answers[q.id]?.trim() && (
                  <Button
                    onClick={() => handleEasyGradeQuestion(q)}
                    disabled={easyGrading[String(q.id)]}
                    variant="secondary"
                    className="gap-2"
                  >
                    {easyGrading[String(q.id)] ? (
                      <><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />Grading...</>
                    ) : (
                      <><SparklesIcon className="w-4 h-4 text-indigo-600" />Grade with AI</>
                    )}
                  </Button>
                )}
                <button
                  onClick={() => handleShowAnswer(String(q.id))}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors"
                >
                  Show answer
                </button>
              </div>
            )}
            {/* Easy mode: reset button after grading (allow retry) */}
            {easyMode && !isSubmitted && easyGraded.has(String(q.id)) && (
              <div className="mt-3 ml-11">
                <button
                  onClick={() => {
                    setEasyGraded(prev => { const s = new Set(prev); s.delete(String(q.id)); return s; });
                    if (gradingResults[String(q.id)]) setGradingResults(prev => { const r = { ...prev }; delete r[String(q.id)]; return r; });
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline"
                >
                  Reset & try again
                </button>
              </div>
            )}
            {/* Short answer AI feedback in easy mode */}
            {gradingResults[String(q.id)] && q.type === 'short_answer' && (
              <div className="mt-4 ml-11 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <SparklesIcon className="w-4 h-4 text-indigo-500" />
                    EduReach AI Feedback
                  </h5>
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-xs">
                    {gradingResults[String(q.id)].score}%
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <MarkdownRenderer content={gradingResults[String(q.id)].feedback || ''} />
                </div>
              </div>
            )}
            {/* Show Answer: correct answers + model solution for skip path */}
            {shownAnswers.has(String(q.id)) && (
              <div className="mt-4 ml-11 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm text-slate-700 dark:text-slate-300 space-y-3">
                {(q as ShortAnswerQuestion).correct_answers?.length > 0 && (
                  <div>
                    <div className="font-semibold text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">Correct Answer</div>
                    <div className="font-medium">{(q as ShortAnswerQuestion).correct_answers?.join(' / ')}</div>
                  </div>
                )}
                {((q as EssayQuestion).model_solution) && (
                  <div>
                    <div className="font-semibold text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">Model Solution</div>
                    <MarkdownRenderer content={(q as EssayQuestion).model_solution!} />
                  </div>
                )}
                {(q as any).explanation && (
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Explanation</div>
                    {(q as any).images?.length > 0 ? (
                      <MathMarkdown images={(q as any).images}>{(q as any).explanation}</MathMarkdown>
                    ) : (
                      <MarkdownRenderer content={(q as any).explanation} />
                    )}
                  </div>
                )}
              </div>
            )}
            {(showResults || easyGraded.has(String(q.id))) && !shownAnswers.has(String(q.id)) && (q as any).explanation && (
              <div className="mt-4 ml-11 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {q.type === 'essay' ? 'Model Solution' : 'Explanation'}
                </div>
                {(q as any).images?.length > 0 ? (
                  <MathMarkdown images={(q as any).images}>{(q as any).explanation}</MathMarkdown>
                ) : (
                  <MarkdownRenderer content={(q as any).explanation} />
                )}
              </div>
            )}
            {(q as any).source_url && (
              <div className="mt-2 ml-11 text-xs text-slate-400 dark:text-slate-500">
                Source:{' '}
                <a href={(q as any).source_url} target="_blank" rel="noreferrer noopener"
                  className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:underline">
                  {(q as any).source_url}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      {!isSubmitted && (
        <div className="max-w-4xl mx-auto mt-8 flex justify-end">
          <Button onClick={submitAttempt} size="lg" disabled={isSubmittingAttempt} className="w-full md:w-auto">
            {isSubmittingAttempt ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </div>
      )}

    </div>
  );
};
