import React, { useMemo } from 'react';
import { useEnrolledUnits } from '../src/hooks/useCurriculum';
import { themeForTrack } from '../src/utils/trackTheme';

interface MySemesterPageProps {
  onSelectUnit: (unitId: number) => void;
  onExplore: () => void;
  username?: string;
}

export const MySemesterPage: React.FC<MySemesterPageProps> = ({ onSelectUnit, onExplore, username }) => {
  const { data: enrolled = [], isLoading } = useEnrolledUnits();
  const enrolledUnits = useMemo(() => enrolled.map(e => e.unit), [enrolled]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            Courses
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {username ? `Welcome back, ${username}. ` : ''}
            Your units, past papers, lessons, and AI tutor — all in one place.
          </p>
        </div>
        <button
          onClick={onExplore}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Add units
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : enrolledUnits.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <p className="text-5xl mb-4">📚</p>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            No units yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
            Add the units you're studying this semester to get organised past papers,
            video lessons, a curriculum-aware AI tutor, and practice quizzes.
          </p>
          <button
            onClick={onExplore}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Explore units
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {enrolledUnits.map(unit => {
            const theme = themeForTrack(unit.track);
            return (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit.id)}
                className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <div className={`h-1.5 bg-gradient-to-r ${theme.headerGradient}`} />
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                    {unit.code && <span className={theme.accentText}>{unit.code}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${theme.chip}`}>
                      {theme.label}
                    </span>
                    {unit.level && <span className="text-slate-400">{unit.level}</span>}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1">
                    {unit.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {unit.description || unit.syllabus_summary}
                  </p>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {unit.paper_count > 0 && `${unit.paper_count} assessment${unit.paper_count === 1 ? '' : 's'}`}
                    {unit.paper_count > 0 && unit.lesson_count > 0 && ' · '}
                    {unit.lesson_count > 0 && `${unit.lesson_count} lesson${unit.lesson_count === 1 ? '' : 's'}`}
                    {unit.paper_count === 0 && unit.lesson_count === 0 && 'AI tutor & quizzes'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
