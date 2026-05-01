import React, { useState } from 'react';
import { useToast } from '../src/contexts/ToastContext';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { View } from '../App';
import { youtubeService } from '../src/services/youtubeService';

interface CreateCoursePageProps {
  onCourseCreated: (course: any) => Promise<void> | void;
  onCancel: () => void;
  lessonLimit: number;
  setView: (view: View) => void;
}

interface Lesson {
  id: string;
  title: string;
  videoId: string;
  isCompleted: boolean;
  duration: string;
  thumbnail?: string;
  validated?: boolean;
  validating?: boolean;
  videoInfo?: {
    title: string;
    description: string;
    duration?: number;
    hasTranscript?: boolean;
    thumbnail?: string;
    transcript?: string;
  };
  error?: string;
}

export const CreateCoursePage: React.FC<CreateCoursePageProps> = ({ onCourseCreated, onCancel, lessonLimit, setView }) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([
    { id: 'lesson-1', title: '', videoId: '', isCompleted: false, duration: 'N/A' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLesson = () => {
    if (lessons.length >= lessonLimit) {
        toast.error(`You've reached the ${lessonLimit}-lesson limit for your plan. Upgrade to add more.`);
        setView('billing');
        return;
    }
    setLessons([
      ...lessons,
      { id: `lesson-${Date.now()}`, title: '', videoId: '', isCompleted: false, duration: 'N/A' }
    ]);
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };
  
  const handleLessonChange = (index: number, field: 'title' | 'videoId', value: string) => {
    const newLessons = [...lessons];
    newLessons[index][field] = value;
    // Reset validation when video ID changes
    if (field === 'videoId') {
      newLessons[index].validated = false;
      newLessons[index].error = undefined;
      newLessons[index].videoInfo = undefined;
    }
    setLessons(newLessons);
  };
  
  const validateVideo = async (index: number): Promise<boolean> => {
    const lesson = lessons[index];
    const videoId = extractVideoId(lesson.videoId);
    
    if (!videoId || videoId.length !== 11) {
      const newLessons = [...lessons];
      newLessons[index].error = 'Invalid YouTube URL or Video ID';
      newLessons[index].validated = false;
      setLessons(newLessons);
      return false;
    }
    
    const newLessons = [...lessons];
    newLessons[index].validating = true;
    setLessons([...newLessons]);
    
    try {
      const metadata = await youtubeService.getVideoMetadata({ videoId });
      const transcript = await youtubeService.extractTranscript({ videoId });
      
      newLessons[index].validated = true;
      newLessons[index].validating = false;
      newLessons[index].videoInfo = {
        title: metadata?.title || 'Unknown',
        description: metadata?.description,
        duration: metadata?.duration,
        hasTranscript: metadata?.hasTranscript,
        thumbnail: metadata?.thumbnails?.high?.url,
        transcript: transcript.success ? transcript.transcript : undefined
      };
      newLessons[index].error = undefined;
      
      // Auto-fill title if empty
      if (!newLessons[index].title && metadata?.title) {
        newLessons[index].title = metadata.title;
      }
      
      setLessons([...newLessons]);
      return true;
    } catch (error: any) {
      // Keep creation resilient: valid YouTube IDs should still be allowed even if
      // metadata/transcript auto-fetch fails due to transient network/provider issues.
      newLessons[index].validated = true;
      newLessons[index].validating = false;
      newLessons[index].error = 'Could not auto-fetch details; you can still save this course.';
      setLessons([...newLessons]);
      return true;
    }
  };
  
  const extractVideoId = (url: string): string => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regex);
    return match ? match[1] : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    // Auto-validate all videos before submission (same spirit as New Session flow).
    const pendingIndexes = lessons
      .map((lesson, idx) => (!lesson.validated ? idx : -1))
      .filter(idx => idx >= 0);
    if (pendingIndexes.length > 0) {
      await Promise.all(pendingIndexes.map(idx => validateVideo(idx)));
    }

    const stillInvalid = lessons.some((lesson) => !extractVideoId(lesson.videoId));
    if (stillInvalid) {
      toast.error('Please validate all video URLs before creating the course.');
      return;
    }
    
    const courseData = {
      title,
      description,
      isPublic,
      lessons: lessons.map(l => ({
        title: l.title,
        videoId: extractVideoId(l.videoId),
        isCompleted: false,
        duration: l.videoInfo?.duration ? `${Math.floor(l.videoInfo.duration / 60)}:${String(l.videoInfo.duration % 60).padStart(2, '0')}` : 'N/A',
        thumbnail: l.videoInfo?.thumbnail,
        transcript: l.videoInfo?.transcript
      })),
      thumbnail: '/placeholder.svg',
    };
    try {
      setIsSubmitting(true);
      await onCourseCreated(courseData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const atLessonLimit = lessons.length >= lessonLimit;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Course</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
          <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} required className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Visibility</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="form-radio text-indigo-600" /> Public</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="form-radio text-indigo-600" /> Private</label>
            </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-bold mb-4">Lessons ({lessons.length}/{lessonLimit === Infinity ? '∞' : lessonLimit})</h3>
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div key={index} className="flex items-end gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span className="font-bold text-slate-500 dark:text-slate-400">{index + 1}.</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Lesson Title</label>
                  <input type="text" value={lesson.title} onChange={e => handleLessonChange(index, 'title', e.target.value)} required placeholder="e.g., Introduction to React" className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">YouTube URL or Video ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lesson.videoId}
                      onChange={e => handleLessonChange(index, 'videoId', e.target.value)}
                      onPaste={() => {
                        // Match New Session behavior: auto-fetch details immediately after paste.
                        setTimeout(() => validateVideo(index), 50);
                      }}
                      onBlur={() => {
                        if (lessons[index].videoId.trim()) {
                          validateVideo(index);
                        }
                      }}
                      required
                      placeholder="e.g., https://www.youtube.com/watch?v=... or zNzzGgr2mhk"
                      className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => validateVideo(index)}
                      disabled={!lesson.videoId.trim() || lesson.validating}
                      className="px-3 py-2 text-xs rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                    >
                      {lesson.validating ? 'Checking...' : 'Auto-fill'}
                    </button>
                  </div>
                  {lesson.validated && !lesson.error && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Video validated
                    </p>
                  )}
                  {!!lesson.error && (
                    <p className={`mt-1 flex items-center gap-1 text-xs ${lesson.validated ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <XCircleIcon className="w-3.5 h-3.5" />
                      {lesson.error}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => handleRemoveLesson(index)} disabled={lessons.length <= 1} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><TrashIcon className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleAddLesson} disabled={atLessonLimit} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
            <PlusCircleIcon className="w-5 h-5" /> Add Another Lesson
          </button>
           {atLessonLimit && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                You've reached the lesson limit for your current plan. <button type="button" onClick={() => setView('billing')} className="font-bold underline">Upgrade</button> to add more.
              </p>
            )}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving course...' : 'Save Course'}
          </button>
        </div>
      </form>
    </div>
  );
};
