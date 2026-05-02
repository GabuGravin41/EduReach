import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../src/services/apiClient';

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[];
  marks: number;
  order: number;
}

interface SessionData {
  session_id: number;
  title: string;
  assessment_title: string;
  time_limit_minutes: number | null;
  question_count: number;
  questions: Question[];
}

interface Results {
  score: string;
  percentage: number;
  correct: number;
  total: number;
  question_results: Record<string, { correct: boolean | null; user_answer: string; correct_answer: string | null; pending_review?: boolean }>;
}

type Stage = 'enter_pin' | 'enter_name' | 'taking_exam' | 'submitted';

export default function JoinExamPage() {
  const [stage, setStage] = useState<Stage>('enter_pin');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-fill PIN from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) setPin(pinParam);
  }, []);

  // Timer
  useEffect(() => {
    if (stage !== 'taking_exam' || !session?.time_limit_minutes) return;
    setTimeLeft(session.time_limit_minutes * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const handleLookupPin = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/assessments/exam-sessions/join/?pin=${pin.trim()}`);
      setSession(res.data);
      setStage('enter_name');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid PIN. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    if (!displayName.trim()) return;
    setStage('taking_exam');
    setCurrentQ(0);
  };

  const handleSubmit = async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
    const payload = {
      session_id: session.session_id,
      display_name: displayName,
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])),
    };
    try {
      const res = await apiClient.post('assessments/exam-sessions/submit/', payload);
      setResults(res.data);
      setStage('submitted');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = session ? Math.round(((currentQ + 1) / session.questions.length) * 100) : 0;

  // ── PIN Entry ────────────────────────────────────────────────────────────────
  if (stage === 'enter_pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Join Exam</h1>
            <p className="text-gray-500 mt-1">Enter the PIN your teacher gave you</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam PIN</label>
              <input
                type="text"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleLookupPin()}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-3xl font-mono font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl p-4 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleLookupPin}
              disabled={loading || pin.length < 4}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Looking up...' : 'Join'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            No account needed — just enter the PIN and your name
          </p>
        </div>
      </div>
    );
  }

  // ── Name Entry ───────────────────────────────────────────────────────────────
  if (stage === 'enter_name' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{session.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{session.question_count} questions{session.time_limit_minutes ? ` · ${session.time_limit_minutes} min` : ''}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && displayName.trim() && handleStartExam()}
                placeholder="e.g. Alex"
                maxLength={50}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 focus:outline-none text-lg"
                autoFocus
              />
            </div>
            <button
              onClick={handleStartExam}
              disabled={!displayName.trim()}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start Exam
            </button>
            <button
              onClick={() => { setStage('enter_pin'); setSession(null); setError(''); }}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Taking Exam ──────────────────────────────────────────────────────────────
  if (stage === 'taking_exam' && session) {
    const q = session.questions[currentQ];
    const answered = Object.keys(answers).length;
    const isLast = currentQ === session.questions.length - 1;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{session.title}</p>
            <p className="text-xs text-gray-500">{displayName}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{answered}/{session.questions.length} answered</span>
            {timeLeft !== null && (
              <span className={`font-mono text-sm font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-indigo-600'}`}>
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div className="h-1 bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="max-w-2xl mx-auto p-4 pt-8">
          {/* Question */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                Question {currentQ + 1} of {session.questions.length}
              </span>
              {q.marks > 0 && (
                <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              )}
            </div>
            <p className="text-gray-900 font-medium text-lg leading-relaxed">{q.question_text}</p>
          </div>

          {/* Answer area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            {(q.question_type === 'mcq' || q.question_type === 'true_false') && q.options.length > 0 ? (
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      answers[q.id] === opt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : q.question_type === 'true_false' ? (
              <div className="flex gap-3">
                {['True', 'False'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`flex-1 p-4 rounded-xl border-2 font-medium transition-all ${
                      answers[q.id] === opt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type your answer here..."
                rows={5}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 focus:outline-none resize-none"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Exam'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQ(prev => Math.min(session.questions.length - 1, prev + 1))}
                className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

          {/* Question grid overview */}
          <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Questions overview</p>
            <div className="flex flex-wrap gap-2">
              {session.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    i === currentQ
                      ? 'bg-indigo-600 text-white'
                      : answers[session.questions[i].id]
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (stage === 'submitted' && results && session) {
    const passed = results.percentage >= 50;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-green-100' : 'bg-amber-100'}`}>
              <span className="text-3xl font-bold" style={{ color: passed ? '#16a34a' : '#d97706' }}>
                {Math.round(results.percentage)}%
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{passed ? 'Well done!' : 'Keep practising!'}</h2>
            <p className="text-gray-500 mt-1">
              You scored <span className="font-semibold text-gray-900">{results.score}</span>
            </p>
          </div>

          {/* Per-question breakdown */}
          <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
            {session.questions.map((q, i) => {
              const r = results.question_results[String(q.id)];
              if (!r) return null;
              const isCorrect = r.correct === true;
              const isPending = r.pending_review === true;
              return (
                <div key={q.id} className={`p-3 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : isPending ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-medium text-gray-500 mb-1">Q{i + 1}</p>
                  <p className="text-sm text-gray-800 mb-1">{q.question_text}</p>
                  <p className="text-xs text-gray-600">Your answer: <span className="font-medium">{r.user_answer || '(no answer)'}</span></p>
                  {!isPending && !isCorrect && r.correct_answer && (
                    <p className="text-xs text-green-700">Correct: <span className="font-medium">{r.correct_answer}</span></p>
                  )}
                  {isPending && <p className="text-xs text-blue-600 mt-1">Pending teacher review</p>}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setStage('enter_pin'); setPin(''); setDisplayName(''); setSession(null); setAnswers({}); setResults(null); }}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Join Another Exam
          </button>
        </div>
      </div>
    );
  }

  return null;
}
