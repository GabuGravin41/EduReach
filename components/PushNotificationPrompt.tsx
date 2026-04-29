/**
 * PushNotificationPrompt
 * -----------------------
 * A tasteful opt-in card shown to users to enable browser push notifications.
 * Appears after the PWA is installed or on first visit (if supported).
 * Respects prior denial — won't show again if permission was explicitly denied.
 *
 * Props:
 *   onDismiss — called when the user clicks "Maybe later"
 */

import React from 'react';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

interface PushNotificationPromptProps {
  onDismiss: () => void;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({ onDismiss }) => {
  const { isSupported, isSubscribed, permission, subscribe, isLoading, error } = usePushNotifications();

  // Don't show if push is unsupported, already subscribed, or explicitly denied
  if (!isSupported || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Enable push notifications"
      className="flex items-start gap-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 mb-4 shadow-sm"
    >
      {/* Icon */}
      <span className="flex-shrink-0 mt-0.5 text-2xl select-none" aria-hidden="true">🔔</span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 leading-snug">
          Stay on top of your learning
        </p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
          Get study reminders, trial alerts, and encouragement — even when the app is closed.
        </p>
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
        <button
          id="push-enable-btn"
          type="button"
          onClick={subscribe}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {isLoading ? 'Enabling…' : 'Enable'}
        </button>
        <button
          id="push-dismiss-btn"
          type="button"
          onClick={onDismiss}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};
