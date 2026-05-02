import React, { useEffect, useState } from 'react';
import { useToast } from '../src/contexts/ToastContext';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { View, UserTier } from '../App';
import { Button } from './ui/Button';
import { DiscussionsPage } from './DiscussionsPage';
import apiClient from '../src/services/api';
import type { Course as ApiCourse, Lesson as ApiLesson } from '../src/services/courseService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { youtubeService } from '../src/services/youtubeService';

// Use API types as baseline
type Lesson = ApiLesson & {
    thumbnail?: string;
    notes?: string;
};

type Course = ApiCourse & {
    notes?: string;
};

type StartLessonPayload = {
    videoId: string;
    transcript: string;
    title?: string;
    courseId?: number;
    lessonId?: number;
    attachToCourse?: boolean;
};

// Assessment interface for quiz linking
interface Assessment {
    id: number;
    context?: {
        courseId?: number;
        lessonId?: number;
    };
    [key: string]: any;
}

interface CourseDetailPageProps {
    course: Course;
    setView: (view: View) => void;
    onStartLesson: (payload: StartLessonPayload) => void;
    onAddLesson?: (
        courseId: number,
        lesson: {
            title: string;
            videoId: string;
            videoUrl?: string;
            transcript?: string;
            transcriptLanguage?: string;
            autoFetchTranscript?: boolean;
        }
    ) => Promise<void> | void;
    onUpdateLesson?: (courseId: number, lessonId: number, updates: any) => void;
    userTier: UserTier;
    currentUserId?: number;
    onUpdateCourse?: (courseId: number, updates: Partial<Course>) => void;
    onDeleteCourse?: (courseId: number) => Promise<void> | void;
    assessments?: Assessment[];
    onSelectExam?: (examId: number) => void;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
    course,
    setView,
    onStartLesson,
    onAddLesson,
    onUpdateLesson,
    userTier,
    currentUserId,
    onUpdateCourse,
    onDeleteCourse,
    assessments = [],
    onSelectExam
}) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'lessons' | 'discussions' | 'notes' | 'manage'>('lessons');
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    const [lessonsWithNotes, setLessonsWithNotes] = useState<Lesson[]>([]);
    const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

    // Manage Course State (simple title/description editing)
    const [editForm, setEditForm] = useState({ title: '', description: '' });

    // Quick lesson add form
    const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
    const [lessonForm, setLessonForm] = useState({
        title: '',
        videoUrl: '',
        transcriptLanguage: 'en',
        autoFetchTranscript: true,
        validated: false,
        validating: false,
        videoInfo: undefined as any,
        error: undefined as string | undefined,
    });
    const [isSavingLesson, setIsSavingLesson] = useState(false);
    const [lessonFormError, setLessonFormError] = useState('');

    // Lesson editing state
    const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
    const [editingLessonTitle, setEditingLessonTitle] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);
    const [completingLessonId, setCompletingLessonId] = useState<number | null>(null);
    // Local tracking of completed lesson IDs for immediate UI update (overrides API data until next refetch)
    const [localCompletedIds, setLocalCompletedIds] = useState<Set<number> | null>(null);
    const [transcriptModalLesson, setTranscriptModalLesson] = useState<Lesson | null>(null);
    const [manualTranscript, setManualTranscript] = useState('');
    const [transcriptLanguageInput, setTranscriptLanguageInput] = useState('en');
    const [isSavingTranscript, setIsSavingTranscript] = useState(false);
    const [isRetryingTranscript, setIsRetryingTranscript] = useState(false);
    const [transcriptModalError, setTranscriptModalError] = useState('');
    const canManageCourse = Boolean(currentUserId && course?.owner?.id === currentUserId);
    const isAdmin = userTier === 'admin';
    const canSeeTranscriptStatus = canManageCourse || isAdmin;

    useEffect(() => {
        if (course) {
            setEditForm({ title: course.title, description: course.description });
            setLocalCompletedIds(null); // reset so fresh API data is used
            loadLessonNotes();
        }
    }, [course?.id]);

    useEffect(() => {
        if (!canManageCourse && activeTab === 'manage') {
            setActiveTab('lessons');
        }
    }, [canManageCourse, activeTab]);

    const loadLessonNotes = async () => {
        if (!course?.lessons) return;

        try {
            const lessonsData = await Promise.all(
                course.lessons.map(async (lesson) => {
                    try {
                        const response = await apiClient.get(`/lessons/${lesson.id}/get_notes/`);
                        if (response.data.success && response.data.notes) {
                            return {
                                ...lesson,
                                notes: response.data.notes.notes || ''
                            };
                        }
                    } catch (error) {
                        console.error(`Failed to load notes for lesson ${lesson.id}:`, error);
                    }
                    return lesson;
                })
            );
            setLessonsWithNotes(lessonsData.filter(Boolean) as Lesson[]);
        } catch (error) {
            console.error('Failed to load lesson notes:', error);
        }
    };

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

    const getLessonTranscript = (lesson: Lesson) =>
        (lesson.transcript || lesson.manual_transcript || '').trim() || undefined;

    const handleQuickLessonSubmit = async () => {
        if (!canManageCourse) {
            setLessonFormError('You can only add lessons to courses you created.');
            return;
        }
        if (!lessonForm.title || !lessonForm.videoUrl) {
            setLessonFormError('Provide both a lesson title and video URL');
            return;
        }
        const videoId = extractVideoId(lessonForm.videoUrl) || lessonForm.videoUrl;
        if (!videoId) {
            setLessonFormError('Enter a valid YouTube URL or video ID');
            return;
        }

        // Auto-validate video if not already validated
        if (!lessonForm.validated && !lessonForm.validating) {
            await validateLessonVideo();
        }

        if (!lessonForm.validated) {
            setLessonFormError('Please validate the video URL before saving.');
            return;
        }

        if (!onAddLesson) return;

        try {
            setIsSavingLesson(true);
            setLessonFormError('');
            await onAddLesson(course.id, {
                title: lessonForm.title,
                videoId,
                videoUrl: lessonForm.videoUrl,
                transcript: lessonForm.videoInfo?.transcript || '',
                transcriptLanguage: lessonForm.transcriptLanguage,
                autoFetchTranscript: lessonForm.autoFetchTranscript,
            });
            setLessonForm({
                title: '',
                videoUrl: '',
                transcriptLanguage: 'en',
                autoFetchTranscript: true,
                validated: false,
                validating: false,
                videoInfo: undefined,
                error: undefined,
            });
            setIsLessonFormOpen(false);
        } catch (error) {
            console.error('Failed to add lesson', error);
            const apiError = (error as any)?.response?.data;
            const friendly =
                apiError?.error ||
                apiError?.detail ||
                ((error as any)?.response?.status === 403
                    ? 'You do not have permission to add lessons to this course.'
                    : 'Failed to add lesson. Please try again.');
            setLessonFormError(friendly);
        } finally {
            setIsSavingLesson(false);
        }
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

    const handleDeleteCourse = async () => {
        if (!onDeleteCourse || isDeletingCourse) return;
        const confirmed = window.confirm(
            `Delete "${course.title}"? This permanently removes the course and all its lessons.`
        );
        if (!confirmed) return;

        try {
            setIsDeletingCourse(true);
            await onDeleteCourse(course.id);
        } catch (error) {
            console.error('Failed to delete course:', error);
            toast.error('Failed to delete course. Please try again.');
        } finally {
            setIsDeletingCourse(false);
        }
    };

    const handleMarkLessonComplete = async (lessonId: number) => {
        try {
            setCompletingLessonId(lessonId);
            const response = await apiClient.post(`/lessons/${lessonId}/mark_complete/`, {});
            // Immediately update local state from server response so progress bar refreshes instantly
            const serverIds: number[] | undefined = response.data?.completed_lesson_ids;
            if (Array.isArray(serverIds)) {
                setLocalCompletedIds(new Set(serverIds));
            } else {
                setLocalCompletedIds(prev => new Set([...(prev ?? completedLessonIds), lessonId]));
            }
            if (onUpdateLesson) {
                onUpdateLesson(course.id, lessonId, { isCompleted: true });
            }
        } catch (error: any) {
            console.error('Failed to mark lesson complete:', error);
            const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Failed to update progress. Please try again.';
            toast.error(msg);
        } finally {
            setCompletingLessonId(null);
        }
    };

    const handleUnmarkLessonComplete = async (lessonId: number) => {
        try {
            setCompletingLessonId(lessonId);
            const response = await apiClient.post(`/lessons/${lessonId}/unmark_complete/`, {});
            const serverIds: number[] | undefined = response.data?.completed_lesson_ids;
            if (Array.isArray(serverIds)) {
                setLocalCompletedIds(new Set(serverIds));
            } else {
                setLocalCompletedIds(prev => {
                    const next = new Set(prev ?? completedLessonIds);
                    next.delete(lessonId);
                    return next;
                });
            }
            if (onUpdateLesson) {
                onUpdateLesson(course.id, lessonId, { isCompleted: false });
            }
        } catch (error: any) {
            console.error('Failed to unmark lesson complete:', error);
            const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Failed to update progress. Please try again.';
            toast.error(msg);
        } finally {
            setCompletingLessonId(null);
        }
    };

    const extractVideoId = (urlOrId: string): string | null => {
        if (!urlOrId) return null;
        const trimmed = urlOrId.trim();
        if (/^[0-9A-Za-z_-]{11}$/.test(trimmed)) return trimmed;
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([0-9A-Za-z_-]{11})/;
        const match = trimmed.match(regex);
        return match ? match[1] : null;
    };

    const validateLessonVideo = async (): Promise<boolean> => {
        const videoId = extractVideoId(lessonForm.videoUrl);
        
        if (!videoId || videoId.length !== 11) {
            setLessonForm(prev => ({
                ...prev,
                error: 'Invalid YouTube URL or Video ID',
                validated: false,
                validating: false
            }));
            return false;
        }
        
        setLessonForm(prev => ({ ...prev, validating: true }));
        
        try {
            const metadata = await youtubeService.getVideoMetadata({ videoId });
            const transcript = await youtubeService.extractTranscript({ videoId });
            
            setLessonForm(prev => ({
                ...prev,
                validated: true,
                validating: false,
                videoInfo: {
                    title: metadata?.title || 'Unknown',
                    description: metadata?.description,
                    duration: metadata?.duration,
                    hasTranscript: metadata?.hasTranscript,
                    thumbnail: metadata?.thumbnails?.high?.url,
                    transcript: transcript.success ? transcript.transcript : undefined
                },
                error: undefined
            }));
            
            // Auto-fill title if empty
            if (!lessonForm.title && metadata?.title) {
                setLessonForm(prev => ({ ...prev, title: metadata.title }));
            }
            
            return true;
        } catch (error: any) {
            setLessonForm(prev => ({
                ...prev,
                validated: true,
                validating: false,
                error: 'Could not auto-fetch details; you can still save this lesson.'
            }));
            return true;
        }
    };

    const handleEditLesson = (lesson: Lesson) => {
        setEditingLessonId(lesson.id);
        setEditingLessonTitle(lesson.title);
    };

    const handleSaveLessonEdit = async (lessonId: number) => {
        if (!editingLessonTitle.trim()) {
            toast.error('Lesson title cannot be empty');
            return;
        }

        try {
            setIsSavingEdit(true);
            await apiClient.patch(`/lessons/${lessonId}/`, {
                title: editingLessonTitle
            });
            // Trigger parent to refresh courses
            if (onUpdateLesson) {
                onUpdateLesson(course.id, lessonId, { title: editingLessonTitle });
            }
            setEditingLessonId(null);
        } catch (error) {
            console.error('Failed to update lesson:', error);
            toast.error('Failed to update lesson. Please try again.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteLesson = async (lessonId: number) => {
        try {
            setDeleteConfirmId(null);
            await apiClient.delete(`/lessons/${lessonId}/`);
            // Trigger parent to refresh courses
            if (onUpdateLesson) {
                onUpdateLesson(course.id, lessonId, {});
            }
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            toast.error('Failed to delete lesson. Please try again.');
        }
    };

    const openTranscriptModal = (lesson: Lesson) => {
        setTranscriptModalLesson(lesson);
        setManualTranscript(lesson.manual_transcript || lesson.transcript || '');
        setTranscriptLanguageInput(lesson.transcript_language || 'en');
        setTranscriptModalError('');
    };

    const closeTranscriptModal = () => {
        setTranscriptModalLesson(null);
        setManualTranscript('');
        setTranscriptModalError('');
    };

    const refreshLessonData = (lessonId: number) => {
        if (onUpdateLesson) {
            onUpdateLesson(course.id, lessonId, {});
        }
    };

    const formatTranscriptUpdateTime = (lesson?: Lesson | null) => {
        if (!lesson?.transcript_fetched_at) return 'Never';
        try {
            return new Date(lesson.transcript_fetched_at).toLocaleString();
        } catch {
            return 'Unknown';
        }
    };

    const handleRetryTranscriptFetch = async () => {
        if (!transcriptModalLesson) return;
        try {
            setIsRetryingTranscript(true);
            setTranscriptModalError('');
            const response = await apiClient.post(
                `/lessons/${transcriptModalLesson.id}/fetch_transcript/`,
                {
                    language: transcriptLanguageInput,
                    force_refresh: true,
                }
            );

            if (response.data?.success) {
                refreshLessonData(transcriptModalLesson.id);
                closeTranscriptModal();
                return;
            }

            setTranscriptModalError(
                response.data?.error || 'Could not fetch transcript automatically. Paste manually below.'
            );
        } catch (error: any) {
            setTranscriptModalError(
                error?.response?.data?.error || 'Auto-fetch failed. Paste transcript manually below.'
            );
        } finally {
            setIsRetryingTranscript(false);
        }
    };

    const handleSaveManualTranscript = async () => {
        if (!transcriptModalLesson) return;
        if (!manualTranscript.trim()) {
            setTranscriptModalError('Paste transcript text before saving.');
            return;
        }
        try {
            setIsSavingTranscript(true);
            setTranscriptModalError('');
            await apiClient.post(
                `/lessons/${transcriptModalLesson.id}/update_manual_transcript/`,
                {
                    manual_transcript: manualTranscript,
                }
            );
            refreshLessonData(transcriptModalLesson.id);
            closeTranscriptModal();
        } catch (error: any) {
            setTranscriptModalError(
                error?.response?.data?.error || 'Failed to save manual transcript.'
            );
        } finally {
            setIsSavingTranscript(false);
        }
    };

    const getLinkedAssessment = (lessonId: number) => {
        return assessments.find(a =>
            a.context?.courseId === course.id &&
            a.context?.lessonId === lessonId
        );
    };

    const getTranscriptStatus = (lesson: Lesson) => {
        const hasTranscript = lesson.has_transcript ?? Boolean(lesson.transcript || lesson.manual_transcript);
        if (hasTranscript) {
            const label = lesson.transcript_language
                ? `Transcript ready (${lesson.transcript_language.toUpperCase()})`
                : 'Transcript ready';
            return {
                label,
                isMissing: false,
                className:
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            };
        }
        return {
            label: 'Transcript missing',
            isMissing: true,
            className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        };
    };

    const completedLessonIds = localCompletedIds ?? new Set<number>(
        Array.isArray((course as any).completed_lesson_ids) ? (course as any).completed_lesson_ids : []
    );
    const courseLessons = (Array.isArray(course.lessons) ? course.lessons : []).map((lesson) => ({
        ...lesson,
        isCompleted: completedLessonIds.size > 0
            ? completedLessonIds.has(lesson.id)
            : Boolean(lesson.isCompleted),
    }));
    const lessonLimit = userTier === 'free' ? 5 : Infinity;
    const visibleLessons = courseLessons.slice(0, lessonLimit);

    const completedCount = courseLessons.filter(l => l.isCompleted).length;
    // Always calculate progress from local state for instant UI updates
    const effectiveProgress = localCompletedIds
        ? Math.round((localCompletedIds.size / (courseLessons.length || 1)) * 100)
        : courseLessons.length > 0
            ? Math.round((completedCount / courseLessons.length) * 100)
            : (typeof course.progress === 'number' ? course.progress : 0);
    const actualProgress = effectiveProgress;

    // Color coding for progress bar: 0-33 red/amber, 34-66 amber/yellow, 67-99 blue, 100 green
    const getProgressBarColor = (pct: number) => {
        if (pct === 100) return 'from-emerald-500 to-green-500';
        if (pct >= 67) return 'from-blue-500 to-indigo-500';
        if (pct >= 34) return 'from-amber-400 to-yellow-500';
        return 'from-red-400 to-amber-500';
    };
    const progressBarColor = getProgressBarColor(actualProgress);

    const nextLesson = courseLessons.find(l => !l.isCompleted) || courseLessons[0];
    const startLabel = actualProgress > 0 ? 'Resume' : 'Start';

    // Aggregate notes from all lessons (use lessonsWithNotes if available)
    const aggregatedNotes = (lessonsWithNotes.length > 0 ? lessonsWithNotes : courseLessons).filter(l => l.notes && l.notes.trim().length > 0);

    return (
        <div>
            <button onClick={() => setView('courses')} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6 p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all">
                <ChevronLeftIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Back to My Courses</span>
                <span className="sm:hidden">Back</span>
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-orange-900/5 overflow-hidden border border-orange-100 dark:border-orange-900/20">
                <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-800 dark:text-white leading-tight">{course.title}</h1>
                            <p className="text-sm sm:text-base leading-relaxed mb-6 text-gray-600 dark:text-gray-300">{course.description}</p>
                        </div>
                        <div className="sm:pt-1">
                            <button
                                onClick={() => {
                                    if (!nextLesson) return;
                                    onStartLesson({
                                        videoId: nextLesson.videoId,
                                        transcript: getLessonTranscript(nextLesson) || '',
                                        title: nextLesson.title,
                                        courseId: course.id,
                                        lessonId: nextLesson.id,
                                        attachToCourse: true,
                                    });
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                            >
                                <PlayIcon className="w-4 h-4" />
                                {startLabel}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                            📚 {completedCount} of {courseLessons.length} lessons completed
                        </span>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <span className={`font-bold text-base transition-colors duration-300 ${
                            actualProgress === 100
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : actualProgress >= 67
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : actualProgress >= 34
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-red-500 dark:text-red-400'
                        }`}>
                            {actualProgress === 100 ? '✓ ' : '🎯 '}{actualProgress}% Complete
                        </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                        <div
                            className={`bg-gradient-to-r ${progressBarColor} h-4 rounded-full transition-all duration-700 ease-out shadow-sm`}
                            style={{ width: `${actualProgress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="border-b border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-gray-800/80 px-4 sm:px-6">
                    <div className="flex gap-2 sm:gap-6 overflow-x-auto scrollbar-hide">
                        <button onClick={() => setActiveTab('lessons')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'lessons' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Lessons ({courseLessons.length})</button>
                        <button onClick={() => setActiveTab('notes')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'notes' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>My Notes ({aggregatedNotes.length})</button>
                        <button onClick={() => setActiveTab('discussions')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'discussions' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Discussions</button>
                        {canManageCourse && (
                            <button onClick={() => setActiveTab('manage')} className={`py-3 sm:py-4 px-3 sm:px-4 font-semibold border-b-3 transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${activeTab === 'manage' ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-700 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'}`}>Manage Course</button>
                        )}
                    </div>
                </div>

                {activeTab === 'lessons' && (
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6">
                        {!canManageCourse && (
                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                This course is read-only for your account. You can start lessons, but only the course creator can add or edit lessons.
                            </div>
                        )}
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                📖 Lessons
                            </h2>
                            {canManageCourse && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsLessonFormOpen((prev) => !prev)}
                                >
                                    {isLessonFormOpen ? 'Close form' : 'Add lesson'}
                                </Button>
                            )}
                        </div>
                        {isLessonFormOpen && (
                            <div className="mb-6 space-y-4">
                                <div className="flex items-end gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="font-bold text-slate-500 dark:text-slate-400">New</span>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1">Lesson Title</label>
                                        <input 
                                            type="text" 
                                            value={lessonForm.title} 
                                            onChange={e => setLessonForm(prev => ({ ...prev, title: e.target.value }))} 
                                            required 
                                            placeholder="e.g., Introduction to React" 
                                            className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1">YouTube URL or Video ID</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={lessonForm.videoUrl}
                                                onChange={e => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value, validated: false, error: undefined }))}
                                                onPaste={() => {
                                                    // Auto-fetch details immediately after paste
                                                    setTimeout(() => validateLessonVideo(), 50);
                                                }}
                                                onBlur={() => {
                                                    if (lessonForm.videoUrl.trim()) {
                                                        validateLessonVideo();
                                                    }
                                                }}
                                                required
                                                placeholder="e.g., https://www.youtube.com/watch?v=... or zNzzGgr2mhk"
                                                className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => validateLessonVideo()}
                                                disabled={!lessonForm.videoUrl.trim() || lessonForm.validating}
                                                className="px-3 py-2 text-xs rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                                            >
                                                {lessonForm.validating ? 'Checking...' : 'Auto-fill'}
                                            </button>
                                        </div>
                                        {lessonForm.validated && !lessonForm.error && (
                                            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                Video validated
                                            </p>
                                        )}
                                        {!!lessonForm.error && (
                                            <p className={`mt-1 flex items-center gap-1 text-xs ${lessonForm.validated ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                <XCircleIcon className="w-3.5 h-3.5" />
                                                {lessonForm.error}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleQuickLessonSubmit} isLoading={isSavingLesson} size="sm">
                                            Save lesson
                                        </Button>
                                        <Button variant="ghost" onClick={() => setIsLessonFormOpen(false)} size="sm">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                                {lessonFormError && (
                                    <p className="text-sm text-rose-500">
                                        {lessonFormError}
                                    </p>
                                )}
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
                                    const isEditing = editingLessonId === lesson.id;
                                    const transcriptStatus = getTranscriptStatus(lesson);

                                    return (
                                        <li key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 ${
                                            lesson.isCompleted
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                                                : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-500'
                                        }`}>
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 ${lesson.isCompleted ? 'bg-emerald-500 scale-110' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                                    {lesson.isCompleted
                                                        ? <CheckCircleIcon className="w-5 h-5 text-white" />
                                                        : <PlayIcon className="w-4 h-4 text-white" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {isEditing ? (
                                                        <div className="flex gap-2 items-center mb-2">
                                                            <input
                                                                type="text"
                                                                value={editingLessonTitle}
                                                                onChange={(e) => setEditingLessonTitle(e.target.value)}
                                                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                                placeholder="Lesson title"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleSaveLessonEdit(lesson.id)}
                                                                disabled={isSavingEdit}
                                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                {isSavingEdit ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingLessonId(null)}
                                                                className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold text-sm sm:text-base truncate text-gray-800 dark:text-white">{lesson.title}</p>
                                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                                                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                                                                    <ClockIcon className="w-3 h-3" /> {lesson.duration}
                                                                </span>
                                                                {canSeeTranscriptStatus && (
                                                                <span
                                                                    className={`px-2 py-1 rounded-full font-medium ${transcriptStatus.className} ${transcriptStatus.isMissing && canManageCourse ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                                    onClick={() => { if (transcriptStatus.isMissing && canManageCourse) openTranscriptModal(lesson); }}
                                                                    title={transcriptStatus.isMissing && canManageCourse ? 'Add transcript manually or retry auto-fetch' : transcriptStatus.isMissing ? 'Transcript missing' : 'Transcript is available'}
                                                                >
                                                                    {transcriptStatus.label}
                                                                </span>
                                                                )}
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
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {deleteConfirmId === lesson.id ? (
                                                <div className="flex gap-2 w-full sm:w-auto bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                                    <p className="text-sm text-red-700 dark:text-red-400 flex-1 flex items-center">Delete this lesson?</p>
                                                    <button
                                                        onClick={() => handleDeleteLesson(lesson.id)}
                                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
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
                                                                transcript: getLessonTranscript(lesson) || '',
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
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => lesson.isCompleted ? handleUnmarkLessonComplete(lesson.id) : handleMarkLessonComplete(lesson.id)}
                                                        isLoading={completingLessonId === lesson.id}
                                                    >
                                                        {lesson.isCompleted ? 'Unmark complete' : 'Mark complete'}
                                                    </Button>
                                                    {canManageCourse && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditLesson(lesson)}
                                                                className="px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                title="Edit lesson"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirmId(lesson.id)}
                                                                className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title="Delete lesson"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
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
                                {aggregatedNotes.map(lesson => {
                                    const isExpanded = expandedNoteId === lesson.id;
                                    return (
                                        <div key={lesson.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <button
                                                    onClick={() => setExpandedNoteId(isExpanded ? null : lesson.id)}
                                                    className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg p-2 -m-2 transition-colors"
                                                >
                                                    <ChevronDownIcon
                                                        className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                                    />
                                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{lesson.title}</h3>
                                                </button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onStartLesson({
                                                            videoId: lesson.videoId,
                                                            transcript: getLessonTranscript(lesson) || '',
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
                                            {isExpanded && (
                                                <div className="prose dark:prose-invert max-w-none text-sm bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <MarkdownRenderer content={lesson.notes || ''} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <p className="text-slate-500 dark:text-slate-400">
                                    You haven't taken any notes for this course yet.
                                    <br />Start a lesson to begin taking notes!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'discussions' && (
                    <div className="bg-white dark:bg-slate-900 p-6">
                        <DiscussionsPage courseId={course.id} currentUserId={currentUserId} />
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
                                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={() => setIsEditingCourse(true)}>Edit Details</Button>
                                        <Button
                                            variant="secondary"
                                            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                            onClick={handleDeleteCourse}
                                            isLoading={isDeletingCourse}
                                            disabled={!onDeleteCourse}
                                        >
                                            Delete Course
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {transcriptModalLesson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Add Transcript - {transcriptModalLesson.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Retry auto-fetch or paste transcript manually to unlock AI lesson features.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Last transcript update: {formatTranscriptUpdateTime(transcriptModalLesson)}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <select
                                value={transcriptLanguageInput}
                                onChange={(e) => setTranscriptLanguageInput(e.target.value)}
                                className="rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="hi">Hindi</option>
                                <option value="pt">Portuguese</option>
                            </select>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleRetryTranscriptFetch}
                                isLoading={isRetryingTranscript}
                            >
                                Retry auto-fetch
                            </Button>
                        </div>

                        <textarea
                            value={manualTranscript}
                            onChange={(e) => setManualTranscript(e.target.value)}
                            rows={10}
                            placeholder="Paste transcript here..."
                            className="mt-4 w-full rounded-md border border-slate-300 bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                        />

                        {transcriptModalError && (
                            <p className="mt-2 text-sm text-rose-500">{transcriptModalError}</p>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={closeTranscriptModal}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveManualTranscript}
                                isLoading={isSavingTranscript}
                            >
                                Save transcript
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
