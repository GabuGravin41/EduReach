
import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { View, UserTier } from '../App';
import { Button } from './ui/Button';
import type { Course, Lesson, Assessment } from '../types';
import { DiscussionsPage } from './DiscussionsPage';
import { PencilIcon } from './icons/PencilIcon';

type StartLessonPayload = {
    videoId: string;
    transcript: string;
    title?: string;
    courseId?: number;
    lessonId?: number; 
    attachToCourse?: boolean;
};

interface CourseDetailPageProps {
    course: Course;
    setView: (view: View) => void;
    onStartLesson: (payload: StartLessonPayload) => void;
    onAddLesson?: (courseId: number, lesson: { title: string; videoId: string; transcript?: string }) => Promise<void> | void;
    userTier: UserTier;
    currentUserId?: number;
    onUpdateCourse?: (courseId: number, updates: Partial<Course>) => void;
    onUpdateLesson?: (courseId: number, lessonId: number, updates: Partial<Lesson>) => void;
    assessments?: Assessment[]; // To link quizzes to lessons
    onSelectExam?: (examId: number) => void; // To open exam detail
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ 
    course, 
    setView, 
    onStartLesson, 
    onAddLesson, 
    userTier, 
    currentUserId,
    onUpdateCourse,
    onUpdateLesson,
    assessments = [],
    onSelectExam
}) => {
    const [activeTab, setActiveTab] = useState<'lessons' | 'discussions' | 'notes' | 'manage'>('lessons');
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    
    // Manage Course State
    const [editForm, setEditForm] = useState({ title: '', description: '' });

    const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
    const [lessonForm, setLessonForm] = useState({ title: '', videoUrl: '' });
    const [isSavingLesson, setIsSavingLesson] = useState(false);
    const [lessonFormError, setLessonFormError] = useState('');

    useEffect(() => {
        if (course) {
            setEditForm({ title: course.title, description: course.description });
        }
    }, [course]);

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

    const handleQuickLessonSubmit = async () => {
        if (!lessonForm.title || !lessonForm.videoUrl) {
            setLessonFormError('Provide both a lesson title and video URL');
            return;
        }
        const videoId = extractVideoId(lessonForm.videoUrl) || lessonForm.videoUrl;
        if (!videoId) {
            setLessonFormError('Enter a valid YouTube URL or video ID');
            return;
        }
        
        alert("Lesson creation via this quick form requires backend integration. Please use 'New Session' and save to course.");
        
        setLessonForm({ title: '', videoUrl: '' });
        setIsLessonFormOpen(false);
    };

    const handleSaveCourseDetails = () => {
        if (onUpdateCourse) {
            onUpdateCourse(course.id, {
                title: editForm.title,
                description: editForm.description
            });
        }
        setIsEditingCourse(false);
    };

    const extractVideoId = (urlOrId: string): string | null => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = urlOrId.match(regex);
        return match ? match[1] : null;
    };

    const getLinkedAssessment = (lessonId: number) => {
        return assessments.find(a => 
            a.context?.courseId === course.id && 
            a.context?.lessonId === lessonId
        );
    };

    const courseLessons = Array.isArray(course.lessons) ? course.lessons : [];
    const lessonLimit = userTier === 'free' ? 5 : Infinity;
    const visibleLessons = courseLessons.slice(0, lessonLimit);
    
    const completedCount = courseLessons.filter(l => l.isCompleted).length;
    const actualProgress = courseLessons.length > 0 
        ? Math.round((completedCount / courseLessons.length) * 100) 
        : 0;
        
    // Aggregate notes from all lessons
    const aggregatedNotes = courseLessons.filter(l => l.notes && l.notes.trim().length > 0);

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
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                            📚 {completedCount} of {courseLessons.length} lessons completed
                        </span>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                            🎯 {actualProgress}% Complete
                        </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 h-4 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: `${actualProgress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="border-b border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-gray-800/80 px-4 sm:px-6">
                    <div className="flex gap-2 sm:gap-6 overflow-x-auto scrollbar-hide">
                        <button onClick={() => setActiveTab('lessons')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'lessons' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Lessons ({courseLessons.length})</button>
                        <button onClick={() => setActiveTab('notes')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'notes' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>My Notes ({aggregatedNotes.length})</button>
                        <button onClick={() => setActiveTab('discussions')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'discussions' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Discussions</button>
                        <button onClick={() => setActiveTab('manage')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'manage' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Manage Course</button>
                    </div>
                </div>

                {activeTab === 'lessons' && (
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            📖 Lessons
                        </h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsLessonFormOpen((prev) => !prev)}
                        >
                            {isLessonFormOpen ? 'Close form' : 'Add lesson'}
                        </Button>
                    </div>
                    {isLessonFormOpen && (
                        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                            <div className="grid gap-3 md:grid-cols-2">
                                <input
                                    type="text"
                                    placeholder="Lesson title"
                                    value={lessonForm.title}
                                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                                />
                                <input
                                    type="text"
                                    placeholder="YouTube URL or video ID"
                                    value={lessonForm.videoUrl}
                                    onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 bg-transparent p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                                />
                            </div>
                            {lessonFormError && (
                                <p className="mt-2 text-sm text-rose-500">
                                    {lessonFormError}
                                </p>
                            )}
                            <div className="mt-3 flex gap-2">
                                <Button onClick={handleQuickLessonSubmit} isLoading={isSavingLesson}>
                                    Save lesson
                                </Button>
                                <Button variant="ghost" onClick={() => setIsLessonFormOpen(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                    {courseLessons.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-base">📚 No lessons have been added to this course yet.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">✨ Lessons will appear here once they are created.</p>
                        </div>
                    ) : (
                    <ul className="space-y-3">
                        {visibleLessons.map((lesson, index) => {
                            const linkedAssessment = getLinkedAssessment(lesson.id);
                            
                            return (
                            <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-slate-500 transition-all duration-200">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${lesson.isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                        <PlayIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm sm:text-base truncate text-gray-800 dark:text-white">{lesson.title}</p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                                                <ClockIcon className="w-3 h-3" /> {lesson.duration}
                                            </span>
                                            {lesson.isCompleted && <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">✓ Completed</span>}
                                            {linkedAssessment && (
                                                <span 
                                                    className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded-full font-medium cursor-pointer hover:bg-teal-200 dark:hover:bg-teal-900/50"
                                                    onClick={(e) => { e.stopPropagation(); onSelectExam && onSelectExam(linkedAssessment.id); }}
                                                >
                                                    <ClipboardCheckIcon className="w-3 h-3" /> Quiz Available
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    {linkedAssessment && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1 sm:flex-none border-teal-200 text-teal-700 hover:bg-teal-50"
                                            onClick={() => onSelectExam && onSelectExam(linkedAssessment.id)}
                                        >
                                            Take Quiz
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() =>
                                            onStartLesson({
                                                videoId: lesson.videoId,
                                                transcript: lesson.transcript || dummyTranscript,
                                                title: lesson.title,
                                                courseId: course.id,
                                                lessonId: lesson.id,
                                                attachToCourse: false,
                                            })
                                        }
                                        className="flex-1 sm:flex-none justify-center"
                                    >
                                        {lesson.isCompleted ? 'Review' : 'Start'}
                                    </Button>
                                </div>
                            </li>
                        )})}
                    </ul>
                    )}
                </div>
                )}
                
                {activeTab === 'notes' && (
                    <div className="bg-white dark:bg-slate-900 p-6 min-h-[300px]">
                         <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <PencilIcon className="w-5 h-5 text-indigo-500" />
                            My Course Notes
                        </h2>
                        {aggregatedNotes.length > 0 ? (
                            <div className="space-y-6">
                                {aggregatedNotes.map(lesson => (
                                    <div key={lesson.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{lesson.title}</h3>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() =>
                                                    onStartLesson({
                                                        videoId: lesson.videoId,
                                                        transcript: lesson.transcript || dummyTranscript,
                                                        title: lesson.title,
                                                        courseId: course.id,
                                                        lessonId: lesson.id,
                                                        attachToCourse: false,
                                                    })
                                                }
                                            >
                                                Edit Note
                                            </Button>
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none text-sm bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <pre className="whitespace-pre-wrap font-sans">{lesson.notes}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <p className="text-slate-500 dark:text-slate-400">
                                    You haven't taken any notes for this course yet. 
                                    <br/>Start a lesson to begin taking notes!
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'discussions' && (
                    <div className="bg-white dark:bg-slate-900 p-6">
                        <DiscussionsPage courseId={course.id} />
                    </div>
                )}

                {activeTab === 'manage' && (
                    <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 min-h-[300px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Course Details</h2>
                        </div>
                        
                        <div className="max-w-2xl">
                            {isEditingCourse ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                                        <input 
                                            type="text" 
                                            value={editForm.title} 
                                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                        <textarea 
                                            value={editForm.description} 
                                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                            rows={4}
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button onClick={handleSaveCourseDetails}>Save Changes</Button>
                                        <Button variant="ghost" onClick={() => { setIsEditingCourse(false); setEditForm({ title: course.title, description: course.description }); }}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                        <p className="text-sm text-slate-500 mb-1">Course Title</p>
                                        <p className="font-semibold text-lg">{course.title}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                        <p className="text-sm text-slate-500 mb-1">Description</p>
                                        <p>{course.description}</p>
                                    </div>
                                    <Button onClick={() => setIsEditingCourse(true)}>Edit Details</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
