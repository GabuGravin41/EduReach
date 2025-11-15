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
    const [activeTab, setActiveTab] = useState<'lessons' | 'discussions'>('lessons');
    
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

    const lessonLimit = userTier === 'free' ? 5 : Infinity;
    const visibleLessons = course.lessons.slice(0, lessonLimit);
    const hiddenLessonsCount = course.lessons.length - visibleLessons.length;

    return (
        <div>
            <button onClick={() => setView('courses')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6">
                <ChevronLeftIcon className="w-5 h-5" />
                Back to My Courses
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 overflow-hidden">
                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                    <p className="leading-relaxed mb-4">{course.description}</p>
                     <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${course.progress}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-slate-500 dark:text-slate-400">{course.progress}% Complete</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('lessons')}
                            className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                                activeTab === 'lessons'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Lessons
                        </button>
                        <button
                            onClick={() => setActiveTab('discussions')}
                            className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
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
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6">
                    <h2 className="text-xl font-bold mb-4">Lessons</h2>
                    <ul className="space-y-3">
                        {visibleLessons.map((lesson, index) => (
                            <li key={index} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${lesson.isCompleted ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                        <PlayIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{lesson.title}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {lesson.duration}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onStartLesson(lesson.videoId, dummyTranscript)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                                    {lesson.isCompleted ? 'Review Lesson' : 'Start Lesson'}
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
                </div>
                )}

                {/* Discussions Tab */}
                {activeTab === 'discussions' && (
                    <div className="p-6">
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
