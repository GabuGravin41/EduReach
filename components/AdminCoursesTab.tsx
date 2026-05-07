import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../src/services/api';

interface Lesson {
  id: number;
  title: string;
  video_url: string;
  video_id: string;
  has_transcript: boolean;
  transcript: string;
  manual_transcript: string;
  order: number;
}

interface Course {
  id: number;
  title: string;
  owner_name?: string;
  lesson_count: number;
  lessons: Lesson[];
}

export const AdminCoursesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<number | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [saveStatus, setSaveStatus] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});

  const { data: courses = [], isLoading, isError } = useQuery<Course[]>({
    queryKey: ['admin', 'all-courses'],
    queryFn: async () => {
      const res = await apiClient.get('courses/?page_size=200');
      const results = res.data?.results ?? res.data ?? [];
      // Fetch lessons for each course
      const withLessons = await Promise.all(
        results.map(async (c: Course) => {
          try {
            const lr = await apiClient.get(`courses/${c.id}/lessons/`);
            return { ...c, lessons: lr.data?.results ?? lr.data ?? [] };
          } catch {
            return { ...c, lessons: [] };
          }
        })
      );
      return withLessons;
    },
    staleTime: 30 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ lessonId, transcript }: { lessonId: number; transcript: string }) => {
      const res = await apiClient.post(`lessons/${lessonId}/update_manual_transcript/`, {
        manual_transcript: transcript,
      });
      return res.data;
    },
    onSuccess: (_, { lessonId }) => {
      setSaveStatus(s => ({ ...s, [lessonId]: 'saved' }));
      setEditingLesson(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-courses'] });
      setTimeout(() => setSaveStatus(s => ({ ...s, [lessonId]: 'idle' })), 2500);
    },
    onError: (_, { lessonId }) => {
      setSaveStatus(s => ({ ...s, [lessonId]: 'error' }));
    },
  });

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson.id);
    setTranscriptDraft(lesson.manual_transcript || lesson.transcript || '');
  };

  const handleSave = (lessonId: number) => {
    if (!transcriptDraft.trim()) return;
    setSaveStatus(s => ({ ...s, [lessonId]: 'saving' }));
    saveMutation.mutate({ lessonId, transcript: transcriptDraft });
  };

  if (isLoading) return (
    <div className="space-y-3 mt-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
      ))}
    </div>
  );

  if (isError) return (
    <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm">
      Failed to load courses. Make sure you are logged in as an admin.
    </div>
  );

  if (courses.length === 0) return (
    <div className="mt-4 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
      No courses found on the platform.
    </div>
  );

  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {courses.length} course{courses.length !== 1 ? 's' : ''} on the platform. Expand a course to view lessons, video URLs, and edit transcripts.
      </p>

      {courses.map(course => {
        const isExpanded = expandedCourse === course.id;
        const lessonsWithoutTranscript = (course.lessons ?? []).filter(l => !l.has_transcript).length;

        return (
          <div key={course.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            {/* Course header */}
            <button
              onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{course.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {course.lesson_count ?? (course.lessons?.length ?? 0)} lesson{(course.lesson_count ?? 0) !== 1 ? 's' : ''}
                    {course.owner_name && ` · ${course.owner_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {lessonsWithoutTranscript > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    {lessonsWithoutTranscript} missing transcript
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Lessons list */}
            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {(!course.lessons || course.lessons.length === 0) ? (
                  <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">No lessons in this course.</p>
                ) : course.lessons.map(lesson => {
                  const isEditing = editingLesson === lesson.id;
                  const status = saveStatus[lesson.id] ?? 'idle';
                  const hasTranscript = lesson.has_transcript || !!(lesson.transcript || lesson.manual_transcript);

                  return (
                    <div key={lesson.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{lesson.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              hasTranscript
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                            }`}>
                              {hasTranscript ? 'Has transcript' : 'No transcript'}
                            </span>
                          </div>

                          {/* Video URL */}
                          {lesson.video_url ? (
                            <div className="mt-1.5 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                              </svg>
                              <a
                                href={lesson.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-xs"
                              >
                                {lesson.video_url}
                              </a>
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 italic">No video URL set</p>
                          )}
                        </div>

                        {/* Edit button */}
                        {!isEditing && (
                          <button
                            onClick={() => handleEdit(lesson)}
                            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors"
                          >
                            {hasTranscript ? 'Edit transcript' : 'Add transcript'}
                          </button>
                        )}
                      </div>

                      {/* Transcript editor */}
                      {isEditing && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={transcriptDraft}
                            onChange={e => setTranscriptDraft(e.target.value)}
                            rows={8}
                            placeholder="Paste or type the transcript here..."
                            className="w-full text-sm p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-y font-mono"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(lesson.id)}
                              disabled={status === 'saving' || !transcriptDraft.trim()}
                              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                            >
                              {status === 'saving' ? 'Saving…' : 'Save transcript'}
                            </button>
                            <button
                              onClick={() => setEditingLesson(null)}
                              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                            {status === 'saved' && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Saved</span>
                            )}
                            {status === 'error' && (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Failed to save — try again</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
