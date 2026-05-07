import React, { useState } from 'react';
import { authService } from '../src/services/authService';

const ONBOARDING_KEY = 'edureach:onboarding-done';

export const hasCompletedOnboarding = () => {
  try { return !!localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
};

interface Props {
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  subject: string;
  examDate: string;
  level: string;
}

const LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'university', label: 'University / College' },
  { value: 'professional', label: 'Professional / Self-study' },
];

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Information Technology', 'Engineering',
  'Economics', 'Business Studies', 'History', 'Geography',
  'English Literature', 'Law', 'Medicine / Nursing', 'Other',
];

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveSubject = subject === 'Other' ? customSubject : subject;

  const handleFinish = async () => {
    const data: OnboardingData = {
      subject: effectiveSubject,
      examDate,
      level,
    };
    setSaving(true);
    try {
      await authService.updateProfile({
        learning_goal: effectiveSubject.slice(0, 32) as any,
        learner_type: level as any,
        interests: effectiveSubject as any,
      });
    } catch { /* silent — we store locally regardless */ }
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
      localStorage.setItem('edureach:onboarding-data', JSON.stringify(data));
    } catch {}
    setSaving(false);
    onComplete(data);
  };

  const steps = [
    // Step 0: What are you studying?
    <div key="subject" className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">What are you studying?</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Edu will personalise every session around your subject.</p>
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`rounded-lg border px-3 py-2 text-sm text-left transition-all ${
              subject === s
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {subject === 'Other' && (
        <input
          autoFocus
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Type your subject…"
          value={customSubject}
          onChange={e => setCustomSubject(e.target.value)}
        />
      )}
      <button
        disabled={!effectiveSubject.trim()}
        onClick={() => setStep(1)}
        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
      >
        Next →
      </button>
    </div>,

    // Step 1: When is your next exam?
    <div key="exam" className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">When is your next exam?</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Edu will help you pace your revision to hit your deadline.</p>
      <div className="space-y-2">
        <input
          type="date"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={examDate}
          onChange={e => setExamDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        <button
          onClick={() => setExamDate('')}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          No specific date — I'm studying at my own pace
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
          ← Back
        </button>
        <button
          onClick={() => setStep(2)}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          Next →
        </button>
      </div>
    </div>,

    // Step 2: Level
    <div key="level" className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">What's your level?</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm">This helps Edu pitch explanations just right for you.</p>
      <div className="space-y-2">
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
              level === l.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
          ← Back
        </button>
        <button
          disabled={!level || saving}
          onClick={handleFinish}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : "Let's go! 🚀"}
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 relative">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-indigo-500' : i < step ? 'w-4 bg-indigo-300' : 'w-4 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        {/* Logo/brand */}
        <div className="text-center mb-6">
          <span className="text-3xl">🎓</span>
          <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase font-medium">Welcome to EduReach</p>
        </div>
        {steps[step]}
      </div>
    </div>
  );
};
