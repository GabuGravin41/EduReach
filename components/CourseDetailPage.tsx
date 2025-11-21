import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ClockIcon } from './icons/ClockIcon';
import { View, UserTier } from '../App';
import { LockIcon } from './icons/LockIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DiscussionsPage } from './DiscussionsPage';
import type { Course as ApiCourse, Lesson as ApiLesson } from '../src/services/courseService';
import { Button } from './ui/Button';

interface CourseNote {
    id: string;
    lessonId: string;
    lessonTitle: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

type Lesson = ApiLesson & {
    thumbnail?: string;
};

type Course = ApiCourse & {
    notes?: CourseNote[];
};

type StartLessonPayload = {
    videoId: string;
    transcript: string;
    title?: string;
    courseId?: number;
    attachToCourse?: boolean;
};

interface CourseDetailPageProps {
    course: Course;
    setView: (view: View) => void;
    onStartLesson: (payload: StartLessonPayload) => void;
    onAddLesson?: (courseId: number, lesson: { title: string; videoId: string; transcript?: string }) => Promise<void> | void;
    userTier: UserTier;
    currentUserId?: number;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ course, setView, onStartLesson, onAddLesson, userTier, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<'lessons' | 'discussions' | 'notes' | 'manage'>('lessons');
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    const [editedCourse, setEditedCourse] = useState<Course>(
        course ?? {
            id: 0,
            title: '',
            description: '',
            progress: 0,
            thumbnail: '',
            lessons: [],
            isPublic: false,
            notes: [],
        }
    );
    const [isAddingVideo, setIsAddingVideo] = useState(false);
    const [newVideo, setNewVideo] = useState({ title: '', videoId: '', thumbnail: '' });
    const [courseNotes, setCourseNotes] = useState<CourseNote[]>(course?.notes || []);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState({ lessonId: '', content: '' });
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(course?.thumbnail || '');
    const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
    const [lessonForm, setLessonForm] = useState({ title: '', videoUrl: '' });
    const [isSavingLesson, setIsSavingLesson] = useState(false);
    const [lessonFormError, setLessonFormError] = useState('');

    useEffect(() => {
        if (course) {
            setEditedCourse(course);
            setCourseNotes(course.notes || []);
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

    // Handler functions
    const handleAddVideo = async () => {
        if (newVideo.title && newVideo.videoId) {
            const videoId = extractVideoId(newVideo.videoId) || newVideo.videoId;
            const lesson: Lesson = {
                id: Date.now() * -1,
                title: newVideo.title,
                videoId,
                isCompleted: false,
                duration: 'N/A',
                thumbnail: newVideo.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            };
            setEditedCourse({
                ...editedCourse,
                lessons: [...editedCourse.lessons, lesson]
            });
            if (onAddLesson) {
                await onAddLesson(course.id, {
                    title: newVideo.title,
                    videoId,
                    transcript: '',
                });
            }
            setNewVideo({ title: '', videoId: '', thumbnail: '' });
            setIsAddingVideo(false);
        }
    };

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
        if (!onAddLesson) return;

        try {
            setIsSavingLesson(true);
            setLessonFormError('');
            await onAddLesson(course.id, {
                title: lessonForm.title,
                videoId,
                transcript: '',
            });
            setLessonForm({ title: '', videoUrl: '' });
            setIsLessonFormOpen(false);
        } catch (error) {
            console.error('Failed to add lesson', error);
            setLessonFormError('Failed to add lesson. Please try again.');
        } finally {
            setIsSavingLesson(false);
        }
    };

    const handleRemoveVideo = (lessonId: number) => {
        setEditedCourse({
            ...editedCourse,
            lessons: editedCourse.lessons.filter(l => l.id !== lessonId)
        });
    };

    const handleAddNote = () => {
        if (newNote.content && newNote.lessonId) {
            const lesson = editedCourse.lessons.find(l => l.id.toString() === newNote.lessonId);
            const note: CourseNote = {
                id: Date.now().toString(),
                lessonId: newNote.lessonId,
                lessonTitle: lesson?.title || 'Unknown Lesson',
                content: newNote.content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setCourseNotes([...courseNotes, note]);
            setNewNote({ lessonId: '', content: '' });
            setIsAddingNote(false);
            setSelectedLessonId('');
        }
    };

    const handleRemoveNote = (noteId: string) => {
        setCourseNotes(courseNotes.filter(n => n.id !== noteId));
    };

    const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
                setEditedCourse({ ...editedCourse, thumbnail: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCourse = () => {
        // In a real app, this would save to backend
        console.log('Saving course:', editedCourse);
        console.log('Saving notes:', courseNotes);
        setIsEditingCourse(false);
    };

    const extractVideoId = (urlOrId: string): string | null => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = urlOrId.match(regex);
        return match ? match[1] : null;
    };

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
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${
                                activeTab === 'manage'
                                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                            }`}
                        >
                            Manage Course
                        </button>
                    </div>
                </div>

                {/* Lessons Tab */}
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
                        {visibleLessons.map((lesson, index) => (
                            <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-slate-500 transition-all duration-200">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${lesson.isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
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
                                <Button
                                    onClick={() =>
                                        onStartLesson({
                                            videoId: lesson.videoId,
                                            transcript: dummyTranscript,
                                            title: lesson.title,
                                            courseId: course.id,
                                            attachToCourse: false,
                                        })
                                    }
                                    className="w-full sm:w-auto justify-center"
                                >
                                    {lesson.isCompleted ? 'Review' : 'Start'}
                                </Button>
                            </li>
                        ))}
                        {hiddenLessonsCount > 0 && (
                            <li className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl bg-slate-50 dark:bg-slate-800/70 border-2 border-dashed border-slate-200 dark:border-slate-600">
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
                                                onClick={() =>
                                                    onStartLesson({
                                                        videoId: lesson.videoId,
                                                        transcript: dummyTranscript,
                                                        title: lesson.title,
                                                        courseId: course.id,
                                                        attachToCourse: false,
                                                    })
                                                }
                                                className="text-sm text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 font-medium hover:underline transition-colors"
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

                {/* Manage Tab - Available to All Users */}
                {activeTab === 'manage' && (
                    <div className="p-4 sm:p-6 bg-gradient-to-b from-orange-25 to-white dark:from-gray-800 dark:to-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Course</h2>
                            <div className="flex gap-2">
                                {!isEditingCourse ? (
                                    <button
                                        onClick={() => setIsEditingCourse(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Edit Course
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleSaveCourse}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => setIsEditingCourse(false)}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Course Basic Info */}
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-6 mb-6 shadow-sm">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Course Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Title</label>
                                    <input
                                        type="text"
                                        value={editedCourse.title}
                                        onChange={(e) => setEditedCourse({ ...editedCourse, title: e.target.value })}
                                        disabled={!isEditingCourse}
                                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={editedCourse.description}
                                        onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                                        disabled={!isEditingCourse}
                                        rows={3}
                                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Thumbnail</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                                            {thumbnailPreview ? (
                                                <img src={thumbnailPreview} alt="Course thumbnail" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <span className="text-xs">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleThumbnailUpload}
                                                disabled={!isEditingCourse}
                                                className="text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload a course thumbnail image</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Video Management */}
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-6 mb-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Video Lessons</h3>
                                <button
                                    onClick={() => setIsAddingVideo(true)}
                                    disabled={!isEditingCourse}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                                >
                                    Add Video
                                </button>
                            </div>

                            {isAddingVideo && (
                                <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-4 mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Lesson Title"
                                            value={newVideo.title}
                                            onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="YouTube URL or Video ID"
                                            value={newVideo.videoId}
                                            onChange={(e) => setNewVideo({ ...newVideo, videoId: e.target.value })}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Custom Thumbnail URL (optional)"
                                            value={newVideo.thumbnail}
                                            onChange={(e) => setNewVideo({ ...newVideo, thumbnail: e.target.value })}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={handleAddVideo}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddingVideo(false);
                                                setNewVideo({ title: '', videoId: '', thumbnail: '' });
                                            }}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {editedCourse.lessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-500 rounded overflow-hidden">
                                                {lesson.thumbnail ? (
                                                    <img src={lesson.thumbnail} alt={lesson.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <PlayIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">{lesson.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{lesson.videoId}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveVideo(lesson.id)}
                                            disabled={!isEditingCourse}
                                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg disabled:opacity-50"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes Management */}
                        <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Course Notes</h3>
                                <button
                                    onClick={() => setIsAddingNote(true)}
                                    disabled={!isEditingCourse}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                                >
                                    Add Note
                                </button>
                            </div>

                            {isAddingNote && (
                                <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-4 mb-4">
                                    <div className="space-y-4">
                                        <select
                                            value={newNote.lessonId}
                                            onChange={(e) => setNewNote({ ...newNote, lessonId: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select a lesson</option>
                                            {editedCourse.lessons.map((lesson) => (
                                                <option key={lesson.id} value={lesson.id.toString()}>{lesson.title}</option>
                                            ))}
                                        </select>
                                        <textarea
                                            placeholder="Note content..."
                                            value={newNote.content}
                                            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                            rows={3}
                                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddNote}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Add Note
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingNote(false);
                                                    setNewNote({ lessonId: '', content: '' });
                                                }}
                                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {courseNotes.map((note) => (
                                    <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">{note.lessonTitle}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(note.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveNote(note.id)}
                                                disabled={!isEditingCourse}
                                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded disabled:opacity-50"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
