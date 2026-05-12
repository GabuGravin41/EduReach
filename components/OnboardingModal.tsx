import React, { useState } from 'react';
import { authService } from '../src/services/authService';
import {
  FIELD_LABELS,
  saveOnboardingPrefs,
  type OnboardingPrefs,
} from '../src/hooks/useOnboardingPrefs';
export { hasCompletedOnboarding } from '../src/hooks/useOnboardingPrefs';

// ── Re-export OnboardingData for App.tsx compatibility ─────────────────────
export interface OnboardingData {
  fields: string[];
  level: string;
  goals: string[];
  examDate?: string;
  subject?: string; // legacy compat
}

const LEVELS = [
  { value: 'secondary',     label: 'Secondary School',          sub: 'KCSE / Form 1–4' },
  { value: 'diploma',       label: 'Diploma / Certificate',     sub: 'TVET, college diploma' },
  { value: 'undergraduate', label: 'Undergraduate',             sub: "Bachelor's degree" },
  { value: 'postgraduate',  label: 'Postgraduate',              sub: "Master's / PhD" },
  { value: 'professional',  label: 'Professional',              sub: 'Self-study / working' },
];

const GOALS = [
  { value: 'exam_prep',       label: '📝  Prepare for upcoming exams' },
  { value: 'past_papers',     label: '📄  Practice past papers' },
  { value: 'concepts',        label: '🧠  Understand difficult concepts' },
  { value: 'general',         label: '🌱  Learn something new at my own pace' },
  { value: 'improve_grades',  label: '📈  Improve my grades' },
];

const ALL_FIELDS = Object.entries(FIELD_LABELS).map(([key, val]) => ({ key, ...val }));

interface Props {
  /** 'visitor' = 4 slides ending with sign-up/guest CTA. 'returning' = 3 slides, auto-saves. */
  mode?: 'visitor' | 'returning';
  onComplete: (data: OnboardingData) => void;
  onContinueAsGuest?: () => void;
  onSignUp?: () => void;
}

export const OnboardingModal: React.FC<Props> = ({
  mode = 'returning',
  onComplete,
  onContinueAsGuest,
  onSignUp,
}) => {
  const isVisitor = mode === 'visitor';
  const totalSteps = isVisitor ? 4 : 3;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  const [fields, setFields] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const goTo = (next: number) => {
    if (animating) return;
    setDirection(next > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 280);
  };

  const toggleField = (key: string) => {
    setFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const toggleGoal = (val: string) => {
    setGoals(prev =>
      prev.includes(val) ? prev.filter(g => g !== val) : [...prev, val]
    );
  };

  const buildData = (): OnboardingData => ({
    fields,
    level,
    goals,
    subject: fields[0] ?? '',
  });

  const persistAndFinish = async (action: 'guest' | 'signup' | 'save') => {
    const data = buildData();
    const prefs: OnboardingPrefs = {
      fields,
      level,
      goals,
      completedAt: new Date().toISOString(),
    };
    saveOnboardingPrefs(prefs);

    setSaving(true);
    try {
      await authService.updateProfile({
        learning_goal: fields[0]?.slice(0, 32) as any,
        learner_type: level as any,
        interests: fields.join(', ') as any,
      });
    } catch { /* silent for guests */ }
    setSaving(false);

    if (action === 'guest' && onContinueAsGuest) {
      onContinueAsGuest();
    } else if (action === 'signup' && onSignUp) {
      onSignUp();
    } else {
      onComplete(data);
    }
  };

  // ── Slide content ──────────────────────────────────────────────────────────

  const slide0 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What are you studying?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pick one or more — EduReach works for all of them.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 -mr-1">
        {ALL_FIELDS.map(({ key, label, emoji, color }) => {
          const selected = fields.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggleField(key)}
              className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-all flex items-center gap-2 ${
                selected
                  ? `${color} ring-2 ring-inset ring-current/30 font-semibold`
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800'
              }`}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="leading-tight">{label}</span>
              {selected && <span className="ml-auto text-xs">✓</span>}
            </button>
          );
        })}
      </div>
      <button
        disabled={fields.length === 0}
        onClick={() => goTo(1)}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
      >
        Next →
      </button>
    </div>
  );

  const slide1 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What level are you at?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This helps us pitch explanations at the right depth.</p>
      </div>
      <div className="space-y-2">
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-all flex items-center justify-between ${
              level === l.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div>
              <div className="text-sm font-medium">{l.label}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{l.sub}</div>
            </div>
            {level === l.value && (
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => goTo(0)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          ← Back
        </button>
        <button
          disabled={!level}
          onClick={() => goTo(2)}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );

  const slide2 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What's your main goal?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select all that apply — we'll tailor your experience.</p>
      </div>
      <div className="space-y-2">
        {GOALS.map(g => {
          const selected = goals.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggleGoal(g.value)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 font-medium'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <span className="flex-1">{g.label}</span>
              {selected && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={() => goTo(1)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          ← Back
        </button>
        <button
          disabled={saving}
          onClick={() => isVisitor ? goTo(3) : persistAndFinish('save')}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : isVisitor ? 'Next →' : "Let's go! 🚀"}
        </button>
      </div>
    </div>
  );

  // Slide 3 — CTA (visitor only)
  const primaryField = fields[0];
  const fieldInfo = primaryField ? FIELD_LABELS[primaryField] : null;
  const slide3 = (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg">
        <span className="text-3xl">{fieldInfo?.emoji ?? '🎓'}</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">You're all set!</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          EduReach will prioritise{' '}
          <strong className="text-slate-700 dark:text-slate-200">
            {fields.map(f => FIELD_LABELS[f]?.label ?? f).join(', ')}
          </strong>{' '}
          content for you. You can always explore everything else too.
        </p>
      </div>

      {/* Feature bullets */}
      <div className="text-left space-y-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        {[
          ['📄', 'Past papers and exam questions from real universities'],
          ['🤖', 'AI tutor that explains any concept in your field'],
          ['📊', 'Progress tracking and personalised recommendations'],
          ['👥', 'Study groups with others in your course'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <span className="text-base leading-5 flex-shrink-0">{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          disabled={saving}
          onClick={() => persistAndFinish('signup')}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : 'Create a free account →'}
        </button>
        <button
          disabled={saving}
          onClick={() => persistAndFinish('guest')}
          className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Start exploring without an account
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Creating an account saves your progress, XP, and streak across devices.
        </p>
      </div>
      <button
        onClick={() => goTo(2)}
        className="text-xs text-slate-400 hover:text-slate-600 underline"
      >
        ← Go back
      </button>
    </div>
  );

  const slides = isVisitor
    ? [slide0, slide1, slide2, slide3]
    : [slide0, slide1, slide2];

  // ── Sliding animation ──────────────────────────────────────────────────────
  const translateX = animating
    ? direction === 'forward' ? '-100%' : '100%'
    : '0%';
  const enterFrom = animating
    ? '0%'
    : direction === 'forward' ? '100%' : '-100%';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="px-6 pt-5 pb-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <span className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase">EduReach</span>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 h-1.5 bg-indigo-500'
                      : i < step
                        ? 'w-3 h-1.5 bg-indigo-300 dark:bg-indigo-600'
                        : 'w-3 h-1.5 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Slide container */}
        <div className="overflow-hidden px-6 pb-6">
          <div
            key={step}
            className="transition-transform duration-300 ease-in-out"
            style={{
              animation: animating
                ? undefined
                : `slideIn 0.28s ease-out`,
            }}
          >
            {slides[step]}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(${direction === 'forward' ? '32px' : '-32px'}); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
