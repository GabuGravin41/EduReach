import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { aiClient } from '../src/services/api';
import type { Question, QuestionType } from '../types';

interface AIImportModalProps {
  onImport: (questions: Question[], suggestedTime?: number, detectedTopic?: string) => void;
  onClose: () => void;
}

type ParseState = 'idle' | 'loading' | 'done' | 'error';

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  multiple_choice: { label: 'Multiple Choice', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' },
  true_false: { label: 'True / False', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' },
  short_answer: { label: 'Short Answer', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' },
  essay: { label: 'Essay', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700' },
  cloze: { label: 'Fill in Blank', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700' },
};

const EXAMPLE_TEXT = `1. What is the capital of France?
A) Berlin  B) Madrid  C) Paris  D) Rome
Answer: C

2. Water boils at 100°C at sea level.
Answer: True

3. What is 7 × 8?
Answer: 56

4. Solve for x: 2x + 5 = 13
Answer: x = 4

5. Explain the significance of the Pythagorean theorem and give two real-world applications.
Answer: The Pythagorean theorem states that in a right-angled triangle, the square of the hypotenuse equals the sum of squares of the other two sides (a²+b²=c²). Applications include architecture (calculating roof slopes) and navigation (finding shortest distances).`;

const solutionText = (raw: any) => (raw.explanation ?? raw.solution ?? raw.model_solution ?? raw.sample_answer ?? '') || '';

function mapParsedQuestion(raw: any, typeOverride?: string): Question {
  const id = raw.id || String(Date.now() + Math.random());
  const type = (typeOverride || raw.type || 'short_answer') as any;
  const base = { id, points: raw.points ?? 1 };
  const explanation = solutionText(raw);

  switch (type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        question_text: raw.question_text || '',
        options: raw.options || ['', '', '', ''],
        correct_answer_index: raw.correct_answer_index ?? 0,
        explanation: explanation || undefined,
      } as any;

    case 'true_false':
      return {
        ...base,
        type: 'true_false',
        question_text: raw.question_text || '',
        correct_answer: typeof raw.correct_answer === 'boolean' ? raw.correct_answer : true,
        explanation: explanation || undefined,
      } as any;

    case 'short_answer':
      return {
        ...base,
        type: 'short_answer',
        question_text: raw.question_text || '',
        correct_answers: Array.isArray(raw.correct_answers) ? raw.correct_answers : [raw.correct_answer || ''],
        case_sensitive: raw.case_sensitive ?? false,
        exact_match: raw.exact_match ?? false,
        max_length: raw.max_length ?? 200,
        explanation: explanation || undefined,
      } as any;

    case 'essay':
      return {
        ...base,
        type: 'essay',
        question_text: raw.question_text || '',
        max_words: raw.max_words ?? 300,
        ai_grading_enabled: raw.ai_grading_enabled ?? true,
        rubric_criteria: raw.rubric_criteria || [],
        sample_answer: explanation || undefined,
        model_solution: explanation || undefined,
      } as any;

    default:
      return {
        ...base,
        type: 'short_answer',
        question_text: raw.question_text || '',
        correct_answers: [String(raw.correct_answer ?? raw.answer ?? '')],
        case_sensitive: false,
        exact_match: false,
        max_length: 200,
        explanation: explanation || undefined,
      } as any;
  }
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
];

export const AIImportModal: React.FC<AIImportModalProps> = ({ onImport, onClose }) => {
  const [rawText, setRawText] = useState('');
  const [topic, setTopic] = useState('');
  const [timeHint, setTimeHint] = useState('');
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [suggestedTime, setSuggestedTime] = useState<number | null>(null);
  const [detectedTopic, setDetectedTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showExample, setShowExample] = useState(false);
  /** Per-question type override (e.g. change short_answer → essay) */
  const [typeOverrides, setTypeOverrides] = useState<Record<string, QuestionType>>({});

  const handleParse = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste your problems and solutions first.');
      return;
    }
    setParseState('loading');
    setErrorMsg('');
    setParsedQuestions([]);

    try {
      const res = await aiClient.post('ai/parse-questions/', {
        raw_text: rawText,
        topic: topic,
        time_hint: timeHint ? Number(timeHint) : undefined,
      });

      const data = res.data;
      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      setParsedQuestions(rawQuestions);
      setSuggestedTime(data.suggested_time_minutes ?? null);
      setDetectedTopic(data.detected_topic || topic);
      setTypeOverrides({});
      setParseState('done');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setParseState('error');
    }
  };

  const displayTimeMinutes = suggestedTime ?? 30;
  const setDisplayTimeMinutes = (minutes: number) => setSuggestedTime(minutes);

  const handleImport = () => {
    const mapped = parsedQuestions.map((q) =>
      mapParsedQuestion(q, typeOverrides[q.id] || q.type)
    );
    onImport(mapped, displayTimeMinutes, detectedTopic || undefined);
  };

  const typeCounts = parsedQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Question Import</h2>
              <p className="text-xs text-violet-100">Paste your problems & solutions — AI will structure them instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Hints row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject / Topic <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. IMO Algebra, Chemistry – Acids"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Intended Time Limit <span className="text-slate-400 font-normal">(minutes, optional)</span>
              </label>
              <input
                type="number"
                value={timeHint}
                onChange={e => setTimeHint(e.target.value)}
                placeholder="e.g. 90"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your Problems &amp; Solutions *
              </label>
              <button
                onClick={() => setShowExample(prev => !prev)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {showExample ? 'Hide example' : 'Show example format'}
              </button>
            </div>

            {showExample && (
              <div className="mb-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {EXAMPLE_TEXT}
              </div>
            )}

            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Paste your questions and answers here in any format.\n\nExamples:\n• Numbered list with answers below each question\n• "Q: ...  A: ..." format\n• MCQ with A/B/C/D options\n• Free-form paragraphs with worked solutions\n\nThe AI will auto-detect question types.`}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-slate-400">
              {rawText.length.toLocaleString()} characters · Supports MCQ, True/False, Short Answer, Essay
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parse button */}
          {parseState !== 'done' && (
            <button
              onClick={handleParse}
              disabled={parseState === 'loading' || !rawText.trim()}
              className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
            >
              {parseState === 'loading' ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  AI is parsing your questions…
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Parse Questions with AI
                </>
              )}
            </button>
          )}

          {/* Results */}
          {parseState === 'done' && parsedQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''} detected
                </span>
                {detectedTopic && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">· Topic: <strong>{detectedTopic}</strong></span>
                )}
                <span className="text-xs text-emerald-600 dark:text-emerald-400">· Time limit:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={Math.floor(displayTimeMinutes / 60)}
                    onChange={(e) => {
                      const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setDisplayTimeMinutes(h * 60 + (displayTimeMinutes % 60));
                    }}
                    className="w-12 px-1.5 py-1 text-sm rounded border border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-center"
                  />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">h</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={displayTimeMinutes % 60}
                    onChange={(e) => {
                      const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                      setDisplayTimeMinutes(Math.floor(displayTimeMinutes / 60) * 60 + m);
                    }}
                    className="w-12 px-1.5 py-1 text-sm rounded border border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-center"
                  />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">m</span>
                </div>
                <div className="flex gap-2 ml-auto flex-wrap">
                  {Object.entries(typeCounts).map(([type, count]) => {
                    const meta = TYPE_META[type] || TYPE_META.short_answer;
                    return (
                      <span key={type} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                        {count} {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Question preview list — each row has editable type */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {parsedQuestions.map((q, i) => {
                  const effectiveType = (typeOverrides[q.id] || q.type || 'short_answer') as string;
                  const meta = TYPE_META[effectiveType] || TYPE_META.short_answer;
                  return (
                    <div key={q.id || i} className={`rounded-lg border p-3 ${meta.bg}`}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <select
                          value={effectiveType}
                          onChange={(e) =>
                            setTypeOverrides((prev) => ({
                              ...prev,
                              [q.id]: e.target.value as QuestionType,
                            }))
                          }
                          className={`text-xs font-bold uppercase tracking-wide rounded border bg-white/80 dark:bg-slate-700/80 px-2 py-0.5 cursor-pointer ${meta.color} border-current focus:ring-1 focus:ring-offset-0`}
                        >
                          {QUESTION_TYPES.map(({ value, label }) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-slate-400">· {q.points ?? 1} pt{(q.points ?? 1) !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">{i + 1}.</span>
                        {q.question_text}
                      </p>
                      {(effectiveType === 'multiple_choice' && Array.isArray(q.options)) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          ✓ Answer: {q.options[q.correct_answer_index] || `Option ${(q.correct_answer_index ?? 0) + 1}`}
                        </p>
                      )}
                      {effectiveType === 'true_false' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          ✓ Answer: {q.correct_answer ? 'True' : 'False'}
                        </p>
                      )}
                      {(effectiveType === 'short_answer' && Array.isArray(q.correct_answers)) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          ✓ Answer: {q.correct_answers.join(' / ')}
                        </p>
                      )}
                      {solutionText(q) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          ✓ Solution: {solutionText(q)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setParsedQuestions([]); setParseState('idle'); setRawText(''); setTypeOverrides({}); }}
                  className="flex-1 py-2.5 px-4 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Start Over
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md text-sm flex items-center justify-center gap-2"
                >
                  <ClipboardCheckIcon className="w-4 h-4" />
                  Add {parsedQuestions.length} Questions to Exam
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
