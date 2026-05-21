import React, { useState, useMemo } from 'react';
import { useUnits, useEnrolUnit, useUnenrolUnit } from '../src/hooks/useCurriculum';
import { useAuth } from '../src/contexts/useAuth';
import { profileTrack } from '../src/services/curriculumService';
import type { Unit, UnitTrack } from '../src/services/curriculumService';

interface ExplorePageProps {
  onSelectUnit: (unitId: number) => void;
}

type Filter = 'recommended' | 'all' | UnitTrack;

// Each filter carries its own accent so Explore isn't a wall of one colour.
const FILTER_META: Record<Filter, { label: string; accent: string; activeBg: string }> = {
  recommended: { label: 'Recommended', accent: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-500' },
  all:         { label: 'All',         accent: 'text-slate-600 dark:text-slate-300', activeBg: 'bg-slate-600' },
  engineering: { label: 'University',  accent: 'text-indigo-600 dark:text-indigo-400', activeBg: 'bg-indigo-600' },
  olympiad:    { label: 'Olympiad',    accent: 'text-violet-600 dark:text-violet-400', activeBg: 'bg-violet-600' },
  general:     { label: 'Courses',     accent: 'text-teal-600 dark:text-teal-400', activeBg: 'bg-teal-600' },
};

export const ExplorePage: React.FC<ExplorePageProps> = ({ onSelectUnit }) => {
  const { user } = useAuth();
  const recTrack = useMemo(() => profileTrack(user), [user]);

  // Open on a profile-tailored view when we have a signal; otherwise everything.
  const [filter, setFilter] = useState<Filter>(recTrack ? 'recommended' : 'all');
  const [search, setSearch] = useState('');

  // 'recommended' resolves to the profile track; 'all' to no track filter.
  const trackParam: UnitTrack | undefined =
    filter === 'recommended' ? (recTrack ?? undefined)
      : filter === 'all' ? undefined
      : filter;

  const { data: units = [], isLoading } = useUnits(trackParam, search.trim() || undefined);
  const enrol = useEnrolUnit();
  const unenrol = useUnenrolUnit();

  const filters: Filter[] = recTrack
    ? ['recommended', 'all', 'engineering', 'olympiad', 'general']
    : ['all', 'engineering', 'olympiad', 'general'];

  const toggle = (unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation();
    if (unit.is_enrolled) unenrol.mutate(unit.id);
    else enrol.mutate(unit.id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">Explore</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {filter === 'recommended'
            ? 'Picked for you, based on what you told us you’re studying. Add any to your semester.'
            : 'Browse units, olympiad topics and courses — add any of them to your semester.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 sticky top-0 z-20 py-3 -mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units, topics, courses…"
          className="flex-1 min-w-48 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === f
                  ? `${FILTER_META[f].activeBg} text-white`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f === 'recommended' ? '✨ ' : ''}{FILTER_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">
          {search.trim()
            ? 'Nothing matches that search. Try a different term.'
            : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {units.map(unit => {
            const meta = FILTER_META[(unit.track as Filter)] ?? FILTER_META.all;
            return (
              <div
                key={unit.id}
                onClick={() => onSelectUnit(unit.id)}
                className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${meta.accent}`}>
                  {unit.code && <span>{unit.code}</span>}
                  <span className="uppercase tracking-wide text-[10px]">{meta.label}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1">{unit.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {unit.description || unit.syllabus_summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {unit.paper_count > 0 && `${unit.paper_count} assessment${unit.paper_count === 1 ? '' : 's'}`}
                    {unit.paper_count > 0 && unit.lesson_count > 0 && ' · '}
                    {unit.lesson_count > 0 && `${unit.lesson_count} lesson${unit.lesson_count === 1 ? '' : 's'}`}
                    {unit.paper_count === 0 && unit.lesson_count === 0 && 'AI tutor & quizzes'}
                  </span>
                  <button
                    onClick={(e) => toggle(unit, e)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      unit.is_enrolled
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {unit.is_enrolled ? 'Added ✓' : '+ Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
