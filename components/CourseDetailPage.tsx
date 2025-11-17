import React, { useState } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ClockIcon } from './icons/ClockIcon';
import { View, UserTier } from '../App';
import { LockIcon } from './icons/LockIcon';
import { DiscussionsPage } from './DiscussionsPage';

interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
    lessons: { title: string; videoId: string; isCompleted: boolean, duration: string }[];
}

interface CourseDetailPageProps {
    course: Course;
    setView: (view: View) => void;
    onStartLesson: (videoId: string, transcript: string) => void;
    userTier: UserTier;
    currentUserId?: number;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ course, setView, onStartLesson, userTier, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<'lessons' | 'discussions' | 'notes'>('lessons');
    
    if (!course) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold">Course Not Found</h2>
                <button onClick={() => setView('courses')} className="mt-4 text-indigo-600 hover:underline">
                    Return to Courses
                </button>
            </div>
        );
    }
    
    const dummyTranscript = `This is a placeholder transcript for the selected video. In a real application, this would be fetched from a server or provided by the user. It demonstrates the flow of starting a lesson from the course page.`;

    // Safely handle lessons array - it might be undefined or empty
    const courseLessons = Array.isArray(course.lessons) ? course.lessons : [];
    const lessonLimit = userTier === 'free' ? 5 : Infinity;
    const visibleLessons = courseLessons.slice(0, lessonLimit);
    const hiddenLessonsCount = courseLessons.length - visibleLessons.length;
    
    // Calculate realistic progress based on completed lessons
    const completedCount = courseLessons.filter(l => l.isCompleted).length;
    const actualProgress = courseLessons.length > 0 
        ? Math.round((completedCount / courseLessons.length) * 100) 
        : 0;

    return (
        <div>
            <button onClick={() => setView('courses')} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6 p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all">
                <ChevronLeftIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Back to My Courses</span>
                <span className="sm:hidden">Back</span>
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-orange-900/5 overflow-hidden border border-orange-100 dark:border-orange-900/20">
                <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-800 dark:text-white leading-tight">{course.title}</h1>
                    <p className="text-sm sm:text-base leading-relaxed mb-6 text-gray-600 dark:text-gray-300">{course.description}</p>
                    
                    {/* Progress Stats */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                            📚 {completedCount} of {courseLessons.length} lessons completed
                        </span>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                            🎯 {actualProgress}% Complete
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 h-4 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: `${actualProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-gray-800/80 px-4 sm:px-6">
                    <div className="flex gap-2 sm:gap-6 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('lessons')}
                            className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${
                                activeTab === 'lessons'
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                            Lessons ({courseLessons.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${
                                activeTab === 'notes'
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                            My Notes
                        </button>
                        <button
                            onClick={() => setActiveTab('discussions')}
                            className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${
                                activeTab === 'discussions'
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                            Discussions
                        </button>
                    </div>
                </div>

                {/* Lessons Tab */}
                {activeTab === 'lessons' && (
                <div className="bg-gradient-to-b from-orange-25 to-white dark:from-gray-800 dark:to-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        📖 Lessons
                    </h2>
                    {courseLessons.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-base">📚 No lessons have been added to this course yet.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">✨ Lessons will appear here once they are created.</p>
                        </div>
                    ) : (
                    <ul className="space-y-3">
                        {visibleLessons.map((lesson, index) => (
                            <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-700/50 border border-orange-100 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-gray-500 transition-all duration-200">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${lesson.isCompleted ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-orange-300 to-amber-300 dark:from-gray-500 dark:to-gray-600'}`}>
                                        <PlayIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm sm:text-base truncate text-gray-800 dark:text-white">{lesson.title}</p>
                                        <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                                                <ClockIcon className="w-3 h-3" /> {lesson.duration}
                                            </span>
                                            {lesson.isCompleted && <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">✓ Completed</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onStartLesson(lesson.videoId, dummyTranscript)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-h-[44px] flex items-center justify-center">
                                    {lesson.isCompleted ? 'Review' : 'Start'}
                                </button>
                            </li>
                        ))}
                        {hiddenLessonsCount > 0 && (
                            <li className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:bg-gray-700/50 border-2 border-dashed border-amber-300 dark:border-gray-600">
                                <LockIcon className="w-10 h-10 text-amber-500 dark:text-amber-400" />
                                <p className="font-semibold text-center text-gray-700 dark:text-gray-300">🔒 ... and {hiddenLessonsCount} more lessons</p>
                                <button onClick={() => setView('pricing')} className="text-sm font-bold py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-h-[44px]">
                                    Upgrade to Unlock
                                </button>
                            </li>
                        )}
                    </ul>
                    )}
                </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="p-4 sm:p-6 bg-gradient-to-b from-orange-25 to-white dark:from-gray-800 dark:to-gray-800">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                            📝 My Course Notes
                        </h2>
                        <div className="space-y-4">
                            {courseLessons.filter(l => l.isCompleted).length === 0 ? (
                                <div className="text-center py-12 bg-gradient-to-br from-orange-50 to-amber-50 dark:bg-gray-700/30 rounded-xl border border-orange-100 dark:border-gray-600">
                                    <p className="text-gray-600 dark:text-gray-400 mb-3 text-base">📝 No notes yet</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">✨ Complete lessons to start taking notes</p>
                                </div>
                            ) : (
                                courseLessons
                                    .filter(l => l.isCompleted)
                                    .map((lesson, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-700/30 rounded-xl p-5 border border-orange-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-base text-gray-800 dark:text-white">{lesson.title}</h3>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">{lesson.duration}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                                📚 Notes from your learning session will appear here. Take notes while watching videos to remember key concepts.
                                            </p>
                                            <button 
                                                onClick={() => onStartLesson(lesson.videoId, dummyTranscript)}
                                                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium hover:underline transition-colors"
                                            >
                                                Review Lesson →
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                )}

                {/* Discussions Tab */}
                {activeTab === 'discussions' && (
                    <div className="p-4 sm:p-6 bg-gradient-to-b from-orange-25 to-white dark:from-gray-800 dark:to-gray-800">
                        <DiscussionsPage 
                            courseId={course.id}
                            currentUserId={currentUserId}
                            apiBaseUrl="http://localhost:8000/api"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
