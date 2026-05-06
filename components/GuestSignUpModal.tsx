import React from 'react';

interface Props {
  /** 'trial_expired' — 14 days up, must sign up to continue
   *  'restricted'    — tried a write/auth-required action */
  reason: 'trial_expired' | 'restricted';
  /** Human-readable name of the blocked action, e.g. "create an assessment" */
  action?: string;
  onSignUp: () => void;
  onLogin: () => void;
  /** Only shown for 'restricted' reason */
  onDismiss?: () => void;
}

export const GuestSignUpModal: React.FC<Props> = ({
  reason,
  action,
  onSignUp,
  onLogin,
  onDismiss,
}) => {
  const isExpired = reason === 'trial_expired';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isExpired ? onDismiss : undefined}
      />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${
          isExpired ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
        }`}>
          {isExpired ? (
            <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>

        {isExpired ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Your 14-day trial is up
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create a free account to keep your progress and continue using EduReach. No payment required.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Account required
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You need an account to {action || 'do this'}. It's free — takes less than a minute.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onSignUp}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            Create free account
          </button>
          <button
            onClick={onLogin}
            className="w-full py-3 px-6 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
          >
            I already have an account — Log in
          </button>
          {!isExpired && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mt-1"
            >
              Not now
            </button>
          )}
        </div>

        {isExpired && (
          <p className="mt-5 text-xs text-slate-400">
            Your activity during the trial is saved and will transfer to your new account.
          </p>
        )}
      </div>
    </div>
  );
};
