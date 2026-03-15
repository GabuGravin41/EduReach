import React from 'react';
import { useToast, Toast } from '../../src/contexts/ToastContext';

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const COLORS: Record<Toast['type'], string> = {
  success: 'bg-emerald-600 border-emerald-500',
  error: 'bg-rose-600 border-rose-500',
  info: 'bg-slate-700 border-slate-600',
};

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-xl border text-white text-sm font-medium min-w-[220px] max-w-xs cursor-pointer select-none ${COLORS[t.type]}`}
          style={{ animation: 'toast-in 0.2s ease-out' }}
        >
          <span className="text-base font-black shrink-0">{ICONS[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
