import React from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { UserTier } from '../App';
import { AdminDashboard } from './AdminDashboard';

interface DashboardProps {
  onStartSession: () => void;
  onSelectCourse: (courseId: number) => void;
  userTier: UserTier;
}

const recentActivity = [
  { type: 'exam', title: 'Python for Everybody', score: '25/25' },
  { type: 'session', title: 'React Hooks In-Depth', video: 'A deep dive into React Hooks' },
];

// Mock API Call - In a real app this would come from props or a hook
const recommendedCourses = [
  { id: 1, title: 'Advanced JavaScript', description: 'Master closures, prototypes, and asynchronous JS.', thumbnail: '/placeholder.svg', isPublic: true },
  { id: 2, title: 'Data Structures & Algorithms', description: 'The foundational course for any aspiring software engineer.', thumbnail: '/placeholder.svg', isPublic: true },
];

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession, onSelectCourse, userTier }) => {

  if (userTier === 'admin') {
      return <AdminDashboard stats={{totalUsers: 1345, coursesCreated: 218, activeAssessments: 45}}/>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Welcome Back!</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Ready to learn something new today?</p>
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
        <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Recommended Courses</h2>
            {recommendedCourses.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-slate-600 dark:text-slate-400 mb-2">No public courses available yet.</p>
                <p className="text-sm text-slate-500">Check back soon for new courses!</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {recommendedCourses.map(course => (
                    <div key={course.id} onClick={() => onSelectCourse(course.id)} className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg shadow-slate-900/5 overflow-hidden cursor-pointer group transition-shadow">
                        <div className="h-32 sm:h-40 bg-slate-200 dark:bg-slate-700 flex items-center justify-center relative">
                            <PlayCircleIcon className="w-12 sm:w-16 h-12 sm:h-16 text-white/50 group-hover:text-white transition-colors" />
                        </div>
                        <div className="p-3 sm:p-4">
                            <h3 className="font-bold text-base sm:text-lg mb-1 line-clamp-1 text-slate-800 dark:text-white">{course.title}</h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
        <div>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Recent Activity</h2>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg shadow-slate-900/5 space-y-4">
                {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            {activity.type === 'exam' ? <ClockIcon className="w-5 h-5 text-slate-500" /> : <PlayCircleIcon className="w-5 h-5 text-slate-500" />}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-white">{activity.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{activity.type === 'exam' ? `Score: ${activity.score}` : activity.video}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};