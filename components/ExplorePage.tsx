import React, { useState } from 'react';
import { useUnits, useEnrolUnit, useUnenrolUnit } from '../src/hooks/useCurriculum';
import type { Unit, UnitTrack } from '../src/services/curriculumService';

interface ExplorePageProps {
  onSelectUnit: (unitId: number) => void;
}

type Filter = 'all' | UnitTrack;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'engineering', label: 'University' },
  { id: 'olympiad', label: 'Olympiad' },
  { id: 'general', label: 'Courses' },
];

export const ExplorePage: React.FC<ExplorePageProps> = ({ onSelectUnit }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const { data: units = [], isLoading } = useUnits(
    filter === 'all' ? undefined : filter,
    search.trim() || undefined,
  );
  const enrol = useEnrolUnit();
  const unenrol = useUnenrolUnit();

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
          Browse units, olympiad topics, and courses — add any of them to your semester.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units, topics, courses…"
          className="flex-1 min-w-48 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter === f.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
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
          Nothing matches that search. Try a different term.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {units.map(unit => (
            <div
              key={unit.id}
              onClick={() => onSelectUnit(unit.id)}
              className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-1">
                {unit.code && <span>{unit.code}</span>}
                {unit.level && <span className="text-slate-400">· {unit.level}</span>}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1">{unit.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {unit.description || unit.syllabus_summary}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {unit.paper_count > 0 && `${unit.paper_count} paper${unit.paper_count === 1 ? '' : 's'}`}
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
          ))}
        </div>
      )}
    </div>
  );
};
