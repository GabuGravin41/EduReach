import React, { useEffect, useState } from 'react';
import { curriculumService } from '../src/services/curriculumService';

interface CourseRedirectProps {
  courseId: number;
  onResolved: (unitId: number) => void;
  onMissing: () => void;
}

/**
 * The course dashboard was retired — a course is now just a unit. This
 * resolves a legacy /courses/:id link to its unit and redirects there.
 */
export const CourseRedirect: React.FC<CourseRedirectProps> = ({ courseId, onResolved, onMissing }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    curriculumService.getUnitByCourse(courseId)
      .then(unit => {
        if (cancelled) return;
        if (unit) onResolved(unit.id);
        else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [courseId, onResolved]);

  if (failed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          This course has moved. Browse units in Explore instead.
        </p>
        <button
          onClick={onMissing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
        >
          Go to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Opening unit…</p>
    </div>
  );
};
