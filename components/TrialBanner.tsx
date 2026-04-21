import React, { useState } from 'react';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgradeClick: () => void;
  onDismiss: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ daysRemaining, onUpgradeClick, onDismiss }) => {
  const isUrgent = daysRemaining <= 2;
  const isLastDay = daysRemaining === 0;

  const label = isLastDay
    ? 'Your Pro trial ends today!'
    : daysRemaining === 1
    ? '1 day left on your Pro trial'
    : `${daysRemaining} days left on your free Pro trial`;

  const subtext = isLastDay
    ? 'Upgrade now to keep all Pro features without interruption.'
    : 'Upgrade before it expires to keep unlimited AI tutoring, advanced assessments, and more.';

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm rounded-xl border mb-4 ${
        isUrgent
          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base flex-shrink-0" aria-hidden="true">
          {isUrgent ? '⏰' : '🎓'}
        </span>
        <div className="min-w-0">
          <span className="font-semibold">{label}</span>
          <span className="hidden sm:inline text-xs opacity-75 ml-2">{subtext}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onUpgradeClick}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            isUrgent
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          Upgrade
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss banner"
          className="opacity-50 hover:opacity-100 transition-opacity p-1 rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
