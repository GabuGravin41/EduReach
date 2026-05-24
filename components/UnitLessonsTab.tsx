import React, { useState } from 'react';
import {
  useUnitLessons,
  useAddLesson,
  useUpdateLesson,
  useDeleteLesson,
  useToggleLessonComplete,
} from '../src/hooks/useCurriculum';
import type { UnitLesson } from '../src/services/curriculumService';

interface UnitLessonsTabProps {
  unitId: number;
  onPlayLesson: (lesson: UnitLesson) => void;
}

export const UnitLessonsTab: React.FC<UnitLessonsTabProps> = ({ unitId, onPlayLesson }) => {
  const { data: lessons = [], isLoading } = useUnitLessons(unitId);
  const addLesson = useAddLesson(unitId);
  const updateLesson = useUpdateLesson(unitId);
  const deleteLesson = useDeleteLesson(unitId);
  const toggleComplete = useToggleLessonComplete(unitId);

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const completed = lessons.filter(l => l.is_completed).length;
  const total = lessons.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const submitAdd = async () => {
    setAddError('');
    if (!newTitle.trim() || !newUrl.trim()) {
      setAddError('A title and a YouTube link are both required.');
      return;
    }
    try {
      await addLesson.mutateAsync({ title: newTitle.trim(), video_url: newUrl.trim() });
      setNewTitle(''); setNewUrl(''); setAdding(false);
    } catch (err: any) {
      setAddError(err?.response?.data?.error || 'Could not add the lesson.');
    }
  };

  const startEdit = (lesson: UnitLesson) => {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditUrl(lesson.video_url);
  };

  const submitEdit = async (lessonId: number) => {
    try {
      await updateLesson.mutateAsync({
        lessonId,
        data: { title: editTitle.trim(), video_url: editUrl.trim() },
      });
      setEditingId(null);
    } catch {
      /* keep the editor open so the user can retry */
    }
  };

  const remove = (lesson: UnitLesson) => {
    if (window.confirm(`Delete the lesson "${lesson.title}"?`)) {
      deleteLesson.mutate(lesson.id);
    }
  };

  return (
    <div>
      {/* Progress + add */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-48">
          {total > 0 && (
            <>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{completed} of {total} complete</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {adding ? 'Cancel' : '+ Add lesson'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 space-y-3">
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Lesson title"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="YouTube link (e.g. https://youtube.com/watch?v=…)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={submitAdd}
            disabled={addLesson.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
          >
            {addLesson.isPending ? 'Adding…' : 'Add lesson'}
          </button>
        </div>
      )}

      {/* Lesson list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          No lessons yet. Add a YouTube video to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              {editingId === lesson.id ? (
                <div className="p-4 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitEdit(lesson.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <button
                    onClick={() => onPlayLesson(lesson)}
                    className="relative flex-none w-24 sm:w-32 h-16 sm:h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 group"
                  >
                    {lesson.thumbnail_url && (
                      <img
                        src={lesson.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-white/90 text-indigo-700 flex items-center justify-center text-sm">▶</span>
                    </span>
                  </button>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="flex-none text-xs font-bold text-slate-400 mt-0.5">
                        {idx + 1}.
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-snug">
                        {lesson.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 ml-5">
                      {lesson.duration && lesson.duration !== 'N/A' ? lesson.duration : 'Video'}
                      {lesson.is_completed ? ' · ✓ completed' : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 ml-5">
                      <button
                        onClick={() => onPlayLesson(lesson)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md"
                      >
                        {lesson.is_completed ? 'Rewatch' : 'Start'}
                      </button>
                      <button
                        onClick={() => toggleComplete.mutate(lesson.id)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                          lesson.is_completed
                            ? 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {lesson.is_completed ? 'Mark not done' : 'Mark complete'}
                      </button>
                      <button
                        onClick={() => startEdit(lesson)}
                        className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(lesson)}
                        className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
