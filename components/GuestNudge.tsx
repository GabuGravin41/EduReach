import React from 'react';

interface GuestNudgeProps {
  visible: boolean;
  action: string;
  onSignUp: () => void;
  onLogin: () => void;
  onDismiss: () => void;
  /** 'inline' (default) — appears below the blocked element; 'bar' — fixed bottom banner */
  variant?: 'inline' | 'bar';
}

export const GuestNudge: React.FC<GuestNudgeProps> = ({
  visible,
  action,
  onSignUp,
  onLogin,
  onDismiss,
  variant = 'inline',
}) => {
  if (!visible) return null;

  if (variant === 'bar') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-up">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-indigo-200 dark:border-indigo-700 p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
              Create a free account to {action}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Takes 20 seconds · your trial and data are kept
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onLogin}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-2 py-1.5"
            >
              Log in
            </button>
            <button
              onClick={onSignUp}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              Create account
            </button>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // inline variant
  return (
    <div className="mt-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-3.5 flex items-start gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 leading-snug">
          Create a free account to {action}
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
          Takes 20 seconds · your trial and all data are kept
        </p>
        <div className="flex items-center gap-3 mt-2.5">
          <button
            onClick={onSignUp}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
          >
            Create free account
          </button>
          <button
            onClick={onLogin}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
