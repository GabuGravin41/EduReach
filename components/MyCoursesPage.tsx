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
}

export const MyCoursesPage: React.FC<MyCoursesPageProps> = ({ courses, onSelectCourse, onNewCourse, userTier, currentUserId }) => {
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
            const actionLabel = progress > 0 ? 'Resume' : 'Start';

            return (
              <div key={course.id} onClick={() => onSelectCourse(course.id)} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 overflow-hidden cursor-pointer group flex flex-col">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 flex items-center justify-center relative overflow-hidden">
                   {course.thumbnail ? (
                       <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                   ) : (
                       <PlayCircleIcon className="w-16 h-16 text-white/50 group-hover:text-white transition-colors" />
                   )}
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <PlayCircleIcon className="w-12 h-12 text-white/80 group-hover:text-white transition-colors" />
                   </div>
                   <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-slate-700">
                      {visibility}
                   </span>
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
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-auto">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{progress}% Complete</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCourse(course.id);
                      }}
                      className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full"
                    >
                      {actionLabel}
                    </button>
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
