import React, { useState } from 'react';

const DISMISSED_KEY = 'edureach:feature-spotlight-dismissed:v2';

interface SpotlightItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
  gradient: string;
}

interface Props {
  onGoToAssessments: () => void;
  onGoToSession: () => void;
  onGoToCreateExam: () => void;
}

export const FeatureSpotlight: React.FC<Props> = ({ onGoToAssessments, onGoToSession, onGoToCreateExam }) => {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    setDismissed(true);
  };

  const items: SpotlightItem[] = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Upload a past paper',
      desc: 'Have an old exam or your own notes? Paste them in and AI will turn them into a full quiz with answers.',
      action: 'Try it →',
      onClick: onGoToCreateExam,
      gradient: 'from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-indigo-100 dark:border-indigo-800',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Learn from any YouTube video',
      desc: 'Paste a YouTube link, get an AI summary and auto-generated quiz — perfect for exam prep on any topic.',
      action: 'Start a session →',
      onClick: onGoToSession,
      gradient: 'from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 border-rose-100 dark:border-rose-800',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.5 3.5 0 0114.5 20.5H10a3.5 3.5 0 01-2.55-1.09l-.347-.348z" />
        </svg>
      ),
      title: 'AI marks your essays instantly',
      desc: 'Set an essay question, students answer, and AI grades every response against your model answer — in seconds.',
      action: 'Create an exam →',
      onClick: onGoToAssessments,
      gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100 dark:border-emerald-800',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold text-slate-800 dark:text-white">Did you know?</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">3 features</span>
        </div>
        <button
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs hover:underline transition-colors"
          aria-label="Dismiss tips"
        >
          Dismiss
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-700">
        {items.map((item) => (
          <div key={item.title} className={`p-5 bg-gradient-to-br ${item.gradient} border-0`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                {item.icon}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{item.desc}</p>
            <button
              onClick={item.onClick}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
