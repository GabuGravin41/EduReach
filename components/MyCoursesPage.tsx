import React from 'react';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UserTier } from '../App';
import type { Course } from '../types';

interface MyCoursesPageProps {
    courses: Course[];
    onSelectCourse: (courseId: number) => void;
    onNewCourse: () => void;
    userTier: UserTier;
    currentUserId?: number;
    highlightedCourseId?: number;
}

export const MyCoursesPage: React.FC<MyCoursesPageProps> = ({ courses, onSelectCourse, onNewCourse, userTier, currentUserId, highlightedCourseId }) => {
  const pageTitle = userTier === 'admin' ? 'Platform Courses' : 'My Courses';
  const hasCourses = courses.length > 0;
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'public' | 'mine' | 'in_progress'>('all');
  const filteredCourses = courses.filter(course => {
    const visibility = (course.is_public ?? course.isPublic) ? 'public' : 'private';
    const progress = typeof course.progress === 'number' ? course.progress : 0;
    if (activeFilter === 'public') return visibility === 'public';
    if (activeFilter === 'mine') return currentUserId ? course.owner?.id === currentUserId : false;
    if (activeFilter === 'in_progress') return progress > 0 && progress < 100;
    return true;
  });
    
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
        <button 
            onClick={onNewCourse}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Create New Course</span>
        </button>
      </div>
      {hasCourses && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Courses' },
            { key: 'public', label: 'Public' },
            { key: 'mine', label: 'My Courses' },
            { key: 'in_progress', label: 'In Progress' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as typeof activeFilter)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                activeFilter === key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {hasCourses ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const lessonCount = course.lessons?.length || 0;
            const updatedAt = course.updated_at ? new Date(course.updated_at).toLocaleDateString() : '—';
            const creatorName = course.owner?.username || 'Unknown';
            const visibility = (course.is_public ?? course.isPublic) ? 'Public' : 'Private';
            const progress = typeof course.progress === 'number' ? course.progress : 0;
            // Derive thumbnail: explicit > first lesson video > null
            const firstVideoId = course.lessons?.[0]?.video_id;
            const cardThumbnail = course.thumbnail
              || (firstVideoId ? `https://img.youtube.com/vi/${firstVideoId}/hqdefault.jpg` : null);
            const actionLabel = progress === 0 ? 'Start Course' : progress === 100 ? 'Review' : 'Continue';
            const isHighlighted = highlightedCourseId === course.id;

            // Color coding: 0-33 red/amber, 34-66 amber/yellow, 67-99 blue, 100 green
            const progressBarColor = progress === 100
                ? 'from-emerald-500 to-green-500'
                : progress >= 67
                    ? 'from-blue-500 to-indigo-500'
                    : progress >= 34
                        ? 'from-amber-400 to-yellow-500'
                        : progress > 0
                            ? 'from-red-400 to-amber-500'
                            : 'from-slate-300 to-slate-300';
            const progressTextColor = progress === 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : progress >= 67
                    ? 'text-blue-600 dark:text-blue-400'
                    : progress >= 34
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400';
            const actionButtonColor = progress === 0
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : progress === 100
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700';

            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={`rounded-xl overflow-hidden cursor-pointer group flex flex-col transition-all ${
                  isHighlighted
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 shadow-xl shadow-emerald-900/20'
                    : 'bg-white dark:bg-slate-800 shadow-lg shadow-slate-900/5'
                }`}
              >
                <div className="h-40 bg-slate-700 flex items-center justify-center relative overflow-hidden">
                   {cardThumbnail ? (
                       <img src={cardThumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                   ) : (
                       <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-800" />
                   )}
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <PlayCircleIcon className="w-12 h-12 text-white/80 group-hover:text-white transition-colors" />
                   </div>
                   <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-slate-700">
                      {visibility}
                   </span>
                   {isHighlighted && (
                     <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-600 text-white">
                       Newly saved
                     </span>
                   )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-lg line-clamp-1">{course.title}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{lessonCount} lessons</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 h-10 flex-grow line-clamp-2">{course.description}</p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Creator:</span> {creatorName} ·
                    <span className="ml-1">Updated {updatedAt}</span>
                  </div>
                  <div className="mt-auto">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`bg-gradient-to-r ${progressBarColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs font-semibold ${progressTextColor}`}>
                        {progress === 100 ? '✓ Complete' : `${progress}% Complete`}
                      </p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectCourse(course.id);
                        }}
                        className={`text-xs font-semibold text-white ${actionButtonColor} px-3 py-1 rounded-full transition-colors`}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center">
          <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first course or start a learning session to generate one automatically.</p>
          <button
            onClick={onNewCourse}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Create New Course
          </button>
        </div>
      )}
    </div>
  );
};
