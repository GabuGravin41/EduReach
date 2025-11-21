import React from 'react';
import type { UserTier } from '../App';
import { Button } from './ui/Button';
import { EmptyState } from './EmptyState';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';

interface LessonSummary {
  id?: number | string;
  title: string;
  duration?: string | number;
  isCompleted?: boolean;
}

interface CourseSummary {
  id: number;
  title: string;
  description?: string;
  progress?: number;
  lessons?: LessonSummary[];
  duration?: string;
  level?: string;
  tags?: string[];
}

interface MyCoursesPageProps {
  courses: CourseSummary[];
  onSelectCourse: (courseId: number) => void;
  onNewCourse: () => void;
  userTier: UserTier;
}

const TIER_LIMITS: Record<UserTier, { courses: number | typeof Infinity }> = {
  free: { courses: 1 },
  learner: { courses: 5 },
  pro: { courses: Infinity },
  pro_plus: { courses: Infinity },
  admin: { courses: Infinity },
};

export const MyCoursesPage: React.FC<MyCoursesPageProps> = ({
  courses,
  onSelectCourse,
  onNewCourse,
  userTier,
}) => {
  const tierLimit = TIER_LIMITS[userTier]?.courses ?? Infinity;
  const hasUnlimitedCourses = tierLimit === Infinity;
  const canCreateCourse = hasUnlimitedCourses || courses.length < tierLimit;
  const usageLabel = hasUnlimitedCourses
    ? `${courses.length} course${courses.length === 1 ? '' : 's'}`
    : `${courses.length}/${tierLimit} courses used`;

  const renderEmptyState = () => (
    <EmptyState
      title="No courses yet"
      description={
        canCreateCourse
          ? 'Launch your first YouTube-powered course in seconds.'
          : 'You have reached the course limit for your current plan.'
      }
      icon={<SparklesIcon className="w-6 h-6 text-blue-500" />}
      action={
        canCreateCourse ? (
          <Button onClick={onNewCourse}>Create a course</Button>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upgrade your plan to add more courses.
          </p>
        )
      }
      className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Courses</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Track progress, continue learning, or spin up a new AI-powered course.
          </p>
          <p className="mt-2 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200">
            {usageLabel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {!canCreateCourse && (
            <p className="text-xs font-medium text-rose-500">
              Limit reached — upgrade to unlock unlimited courses.
            </p>
          )}
          <Button onClick={onNewCourse} disabled={!canCreateCourse}>
            Create course
          </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const progress = Math.min(Math.max(course.progress ?? 0, 0), 100);
            const lessonCount = course.lessons?.length ?? 0;
            const completedLessons = course.lessons?.filter((lesson) => lesson.isCompleted).length ?? 0;

            return (
              <div
                key={course.id}
                className="flex h-full flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-blue-500">
                      {course.level || 'Learning Path'}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-800 dark:text-white">
                      {course.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                    {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                  </span>
                </div>

                {course.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {course.description}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-700/60">
                    <BookOpenIcon className="h-4 w-4 text-slate-400" />
                    {completedLessons}/{lessonCount} completed
                  </span>
                  {course.duration && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-700/60">
                      <ClockIcon className="h-4 w-4 text-slate-400" />
                      {course.duration}
                    </span>
                  )}
                  {course.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-900/30 dark:text-blue-100">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => onSelectCourse(course.id)}>
                    Continue course
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCoursesPage;
 