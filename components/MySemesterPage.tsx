import React, { useState, useMemo } from 'react';
import {
  useEnrolledUnits,
  useUnits,
  useEnrolUnit,
  useUnenrolUnit,
} from '../src/hooks/useCurriculum';
import type { Unit, UnitTrack } from '../src/services/curriculumService';

interface MySemesterPageProps {
  onSelectUnit: (unitId: number) => void;
  username?: string;
}

const TRACK_LABEL: Record<UnitTrack, string> = {
  engineering: 'University Units',
  olympiad: 'Olympiad Topics',
};

export const MySemesterPage: React.FC<MySemesterPageProps> = ({ onSelectUnit, username }) => {
  const { data: enrolled = [], isLoading } = useEnrolledUnits();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const enrolledUnits = useMemo(() => enrolled.map(e => e.unit), [enrolled]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
            My Semester
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {username ? `Welcome back, ${username}. ` : ''}
            Your units, past papers, and AI tutor — all in one place.
          </p>
        </div>
        <button
          onClick={() => setCatalogOpen(true)}
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
            a curriculum-aware AI tutor, and practice quizzes.
          </p>
          <button
            onClick={() => setCatalogOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Add your first unit
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {enrolledUnits.map(unit => (
            <button
              key={unit.id}
              onClick={() => onSelectUnit(unit.id)}
              className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-1">
                {unit.code && <span>{unit.code}</span>}
                {unit.level && <span className="text-slate-400">· {unit.level}</span>}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 mb-1">
                {unit.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {unit.description || unit.syllabus_summary}
              </p>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {unit.track === 'engineering'
                  ? `${unit.paper_count} past paper question${unit.paper_count === 1 ? '' : 's'}`
                  : 'Olympiad topic'}
              </span>
            </button>
          ))}
        </div>
      )}

      {catalogOpen && (
        <UnitCatalogModal
          enrolledIds={new Set(enrolledUnits.map(u => u.id))}
          onClose={() => setCatalogOpen(false)}
        />
      )}
    </div>
  );
};

// ── Unit catalog modal ────────────────────────────────────────────────────────

interface UnitCatalogModalProps {
  enrolledIds: Set<number>;
  onClose: () => void;
}

const UnitCatalogModal: React.FC<UnitCatalogModalProps> = ({ enrolledIds, onClose }) => {
  const [track, setTrack] = useState<UnitTrack>('engineering');
  const { data: units = [], isLoading } = useUnits(track);
  const enrol = useEnrolUnit();
  const unenrol = useUnenrolUnit();

  const toggle = (unit: Unit) => {
    if (enrolledIds.has(unit.id)) unenrol.mutate(unit.id);
    else enrol.mutate(unit.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Add units</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            {(['engineering', 'olympiad'] as UnitTrack[]).map(t => (
              <button
                key={t}
                onClick={() => setTrack(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  track === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {TRACK_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))
          ) : units.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No units in this catalog yet.</p>
          ) : (
            units.map(unit => {
              const isEnrolled = enrolledIds.has(unit.id);
              return (
                <div
                  key={unit.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                      {unit.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {unit.code}
                      {unit.description ? ` · ${unit.description}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(unit)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex-none ${
                      isEnrolled
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isEnrolled ? 'Added ✓' : 'Add'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
