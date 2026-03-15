import React from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { UserTier } from '../App';
import { AdminDashboard } from './AdminDashboard';
import { useCourses, useMyCourses } from '../src/hooks/useCourses';
import { useMyAssessments } from '../src/hooks/useAssessments';

interface DashboardProps {
  onStartSession: () => void;
  onSelectCourse: (courseId: number) => void;
  userTier: UserTier;
  username?: string;
}

// Skeleton loader for course cards
const CourseSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden animate-pulse">
    <div className="h-32 sm:h-40 bg-slate-200 dark:bg-slate-700" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
    </div>
  </div>
);

// Skeleton loader for activity items
const ActivitySkeleton: React.FC = () => (
  <div className="flex items-center gap-4 animate-pulse">
    <div className="w-11 h-11 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession, onSelectCourse, userTier, username }) => {
  const { data: apiCourses, isLoading: coursesLoading } = useCourses();
  const { data: myCourses, isLoading: myCoursesLoading } = useMyCourses();
  const { data: myAssessments, isLoading: assessmentsLoading } = useMyAssessments();

  // Public courses for "Discover" section — exclude ones the user already owns
  const myCourseIds = new Set(Array.isArray(myCourses) ? myCourses.map((c: any) => c.id) : []);
  const publicCourses = Array.isArray(apiCourses)
    ? apiCourses
        .filter((c: any) => (c.is_public === true || c.isPublic === true) && !myCourseIds.has(c.id))
        .slice(0, 4)
    : [];

  // Build real activity feed from user's own data
  const activityItems: { icon: 'course' | 'exam'; title: string; sub: string; id?: number }[] = [];

  if (Array.isArray(myCourses)) {
    myCourses.slice(0, 3).forEach((c: any) => {
      activityItems.push({
        icon: 'course',
        title: c.title ?? 'Untitled Course',
        sub: `${c.lessons?.length ?? c.lesson_count ?? 0} lessons`,
        id: c.id,
      });
    });
  }

  if (Array.isArray(myAssessments)) {
    myAssessments.slice(0, 3).forEach((a: any) => {
      activityItems.push({
        icon: 'exam',
        title: a.title ?? 'Untitled Assessment',
        sub: `${a.question_count ?? a.questions?.length ?? '?'} questions`,
      });
    });
  }

  const activityLoading = myCoursesLoading || assessmentsLoading;

  if (userTier === 'admin') {
    return <AdminDashboard stats={{ totalUsers: 1345, coursesCreated: 218, activeAssessments: 45 }} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
            Welcome back{username ? `, ${username}` : ''}!
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Ready to learn something new today?
          </p>
        </div>
        <button
          onClick={onStartSession}
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-indigo-600 text-white text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <PlusCircleIcon className="w-5 h-5" />
          <span>New Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recommended courses */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Discover Courses</h2>
          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CourseSkeleton /><CourseSkeleton />
            </div>
          ) : publicCourses.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-2xl mb-2">🎓</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">All caught up!</p>
              <p className="text-sm text-slate-500">You've enrolled in all available courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {publicCourses.map((course: any) => (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse(course.id)}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg shadow-slate-900/5 overflow-hidden cursor-pointer group transition-shadow border border-slate-100 dark:border-slate-700"
                >
                  <div className="h-32 sm:h-40 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center relative">
                    <PlayCircleIcon className="w-12 sm:w-16 h-12 sm:h-16 text-indigo-400 group-hover:text-indigo-600 dark:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-bold text-base sm:text-lg mb-1 line-clamp-1 text-slate-800 dark:text-white">
                      {course.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {course.description || 'No description provided.'}
                    </p>
                    {course.owner_username && (
                      <p className="text-xs text-slate-400 mt-2">by {course.owner_username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">My Activity</h2>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg shadow-slate-900/5 border border-slate-100 dark:border-slate-700 space-y-4">
            {activityLoading ? (
              <>
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
              </>
            ) : activityItems.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-2">🌱</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a course or assessment to get started!
                </p>
              </div>
            ) : (
              activityItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 ${item.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => item.id && onSelectCourse(item.id)}
                >
                  <div className={`p-3 rounded-lg shrink-0 ${item.icon === 'exam' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                    {item.icon === 'exam'
                      ? <ClockIcon className="w-5 h-5 text-amber-500" />
                      : <PlayCircleIcon className="w-5 h-5 text-indigo-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.sub}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
