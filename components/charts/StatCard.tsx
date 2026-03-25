import React from 'react';

type ColorKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // positive = up, negative = down
  icon?: React.ReactNode;
  color?: ColorKey;
}

const COLOR_MAP: Record<
  ColorKey,
  { bg: string; iconBg: string; iconText: string; trendUp: string; trendDown: string }
> = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    trendUp: 'text-emerald-600 dark:text-emerald-400',
    trendDown: 'text-rose-500 dark:text-rose-400',
  },
  emerald: {
    bg: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    trendUp: 'text-emerald-600 dark:text-emerald-400',
    trendDown: 'text-rose-500 dark:text-rose-400',
  },
  amber: {
    bg: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
    trendUp: 'text-emerald-600 dark:text-emerald-400',
    trendDown: 'text-rose-500 dark:text-rose-400',
  },
  rose: {
    bg: 'from-rose-500 to-rose-600',
    iconBg: 'bg-rose-50 dark:bg-rose-900/30',
    iconText: 'text-rose-600 dark:text-rose-400',
    trendUp: 'text-emerald-600 dark:text-emerald-400',
    trendDown: 'text-rose-500 dark:text-rose-400',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-50 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    trendUp: 'text-emerald-600 dark:text-emerald-400',
    trendDown: 'text-rose-500 dark:text-rose-400',
  },
};

const TrendArrowUp: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M8 3L13 8H10V13H6V8H3L8 3Z" fill="currentColor" />
  </svg>
);

const TrendArrowDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M8 13L3 8H6V3H10V8H13L8 13Z" fill="currentColor" />
  </svg>
);

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
}) => {
  const palette = COLOR_MAP[color];
  const hasTrend = trend !== undefined && trend !== null;
  const trendUp = hasTrend && trend! >= 0;
  const trendColorClass = trendUp ? palette.trendUp : palette.trendDown;
  const absT = hasTrend ? Math.abs(trend!) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Icon */}
        {icon && (
          <div className={`p-2.5 rounded-lg ${palette.iconBg} ${palette.iconText} flex-shrink-0`}>
            <div className="w-5 h-5">{icon}</div>
          </div>
        )}

        {/* Trend badge */}
        {hasTrend && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ml-auto ${trendColorClass}`}>
            {trendUp ? (
              <TrendArrowUp className="w-3.5 h-3.5" />
            ) : (
              <TrendArrowDown className="w-3.5 h-3.5" />
            )}
            {absT.toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
