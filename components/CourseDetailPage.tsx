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
            <button onClick={() => setView('courses')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                <ChevronLeftIcon className="w-5 h-5" />
                Back to My Courses
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 overflow-hidden">
                <div className="p-4 sm:p-6 lg:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{course.title}</h1>
                    <p className="text-sm sm:text-base leading-relaxed mb-4">{course.description}</p>
                    
                    {/* Progress Stats */}
                    <div className="flex items-center gap-4 mb-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                            {completedCount} of {courseLessons.length} lessons completed
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            {actualProgress}% Complete
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${actualProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-6">
                    <div className="flex gap-4 sm:gap-8 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('lessons')}
                            className={`py-3 sm:py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                                activeTab === 'lessons'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Lessons ({courseLessons.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`py-3 sm:py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                                activeTab === 'notes'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            My Notes
                        </button>
                        <button
                            onClick={() => setActiveTab('discussions')}
                            className={`py-3 sm:py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                                activeTab === 'discussions'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Discussions
                        </button>
                    </div>
                </div>

                {/* Lessons Tab */}
                {activeTab === 'lessons' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold mb-4">Lessons</h2>
                    {courseLessons.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-600 dark:text-slate-400 mb-4">No lessons have been added to this course yet.</p>
                            <p className="text-sm text-slate-500 dark:text-slate-500">Lessons will appear here once they are created.</p>
                        </div>
                    ) : (
                    <ul className="space-y-3">
                        {visibleLessons.map((lesson, index) => (
                            <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${lesson.isCompleted ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <PlayIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm sm:text-base truncate">{lesson.title}</p>
                                        <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {lesson.duration}</span>
                                            {lesson.isCompleted && <span className="text-teal-500">✓ Completed</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onStartLesson(lesson.videoId, dummyTranscript)} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap">
                                    {lesson.isCompleted ? 'Review' : 'Start'}
                                </button>
                            </li>
                        ))}
                        {hiddenLessonsCount > 0 && (
                            <li className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg bg-slate-100 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600">
                                <LockIcon className="w-8 h-8 text-slate-400" />
                                <p className="font-semibold text-center">... and {hiddenLessonsCount} more lessons</p>
                                <button onClick={() => setView('pricing')} className="text-sm font-bold py-2 px-4 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">
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
                    <div className="p-4 sm:p-6">
                        <h2 className="text-xl font-bold mb-4">My Course Notes</h2>
                        <div className="space-y-4">
                            {courseLessons.filter(l => l.isCompleted).length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">No notes yet</p>
                                    <p className="text-sm text-slate-500">Complete lessons to start taking notes</p>
                                </div>
                            ) : (
                                courseLessons
                                    .filter(l => l.isCompleted)
                                    .map((lesson, index) => (
                                        <div key={index} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-base">{lesson.title}</h3>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{lesson.duration}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                                Notes from your learning session will appear here. Take notes while watching videos to remember key concepts.
                                            </p>
                                            <button 
                                                onClick={() => onStartLesson(lesson.videoId, dummyTranscript)}
                                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
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
                    <div className="p-4 sm:p-6">
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
