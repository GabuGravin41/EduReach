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
}

export const MyCoursesPage: React.FC<MyCoursesPageProps> = ({ courses, onSelectCourse, onNewCourse, userTier }) => {
  const pageTitle = userTier === 'admin' ? 'Platform Courses' : 'My Courses';
    
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
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
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-bold text-lg mb-2">{course.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10 flex-grow line-clamp-2">{course.description}</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-auto">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${course.progress}%` }}></div>
              </div>
              <p className="text-right text-xs mt-1 text-slate-500 dark:text-slate-400">{course.progress}% Complete</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
