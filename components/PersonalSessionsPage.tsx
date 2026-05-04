import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../src/services/api';
import { PersonalSession, Course } from '../types';
import { useToast } from '../src/contexts/ToastContext';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { View } from '../App';

interface Props {
  setView: (view: View) => void;
  onOpenSession: (session: PersonalSession) => void;
  courses: Course[];
}

// ── Small modal for adding a session to a course / creating a new course ──────

type ActionMode = 'add_to_course' | 'create_course' | null;

interface ActionModalProps {
  session: PersonalSession;
  courses: Course[];
  onClose: () => void;
  onDone: (msg: string) => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ session, courses, onClose, onDone }) => {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [lessonTitle, setLessonTitle] = useState(session.title || session.video_id);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAddToExisting = async () => {
    if (!selectedCourseId) { setError('Pick a course first.'); return; }
    setBusy(true); setError('');
    try {
      await apiClient.post(`personal-sessions/${session.id}/add_to_course/`, {
        course_id: selectedCourseId,
        lesson_title: lessonTitle,
      });
      onDone(`Added to course successfully.`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add lesson. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseTitle.trim()) { setError('Course title is required.'); return; }
    setBusy(true); setError('');
    try {
      await apiClient.post(`personal-sessions/${session.id}/create_course/`, {
        course_title: courseTitle.trim(),
        course_description: courseDesc.trim(),
        lesson_title: lessonTitle,
        is_public: isPublic,
      });
      onDone(`Course "${courseTitle}" created with this session as lesson 1.`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create course. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Save to Course</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{session.title || session.video_id}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {(['existing', 'new'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === t ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t === 'existing' ? 'Add to Existing Course' : 'Create New Course'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Shared: lesson title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Lesson title</label>
            <input
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
              className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {tab === 'existing' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Choose a course</label>
              {courses.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">You have no courses yet. Create one in the other tab.</p>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(Number(e.target.value))}
                  className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select a course —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course title <span className="text-rose-500">*</span></label>
                <input
                  value={courseTitle}
                  onChange={e => setCourseTitle(e.target.value)}
                  placeholder="e.g. Calculus Deep Dive"
                  className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400">(optional)</span></label>
                <textarea
                  value={courseDesc}
                  onChange={e => setCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="form-radio text-indigo-600" /> Public
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="form-radio text-indigo-600" /> Private
                </label>
              </div>
            </>
          )}

          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          <button
            onClick={tab === 'existing' ? handleAddToExisting : handleCreateCourse}
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition"
          >
            {busy ? 'Saving…' : tab === 'existing' ? 'Add Lesson to Course' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const PersonalSessionsPage: React.FC<Props> = ({ setView, onOpenSession, courses }) => {
  const toast = useToast();
  const [sessions, setSessions] = useState<PersonalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<PersonalSession | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('personal-sessions/');
      setSessions((res.data as any).results ?? res.data ?? []);
    } catch {
      toast.error('Could not load personal sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await apiClient.delete(`personal-sessions/${id}/`);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session deleted.');
    } catch {
      toast.error('Could not delete session.');
    } finally {
      setDeleting(null);
    }
  };

  const thumbnailUrl = (s: PersonalSession) =>
    s.thumbnail_url || `https://img.youtube.com/vi/${s.video_id}/mqdefault.jpg`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Sessions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Standalone learning sessions — open any to resume, or save it into a course.
          </p>
        </div>
        <button
          onClick={() => setView('setup_session')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
        >
          <PlusCircleIcon className="w-4 h-4" /> New Session
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <PlayCircleIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No saved sessions yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            Start a new session and click <strong>Save Session</strong> to keep it here.
          </p>
          <button
            onClick={() => setView('setup_session')}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            Start a Session
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative">
                <img
                  src={thumbnailUrl(session)}
                  alt={session.title}
                  className="w-full aspect-video object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  onClick={() => onOpenSession(session)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition"
                >
                  <PlayCircleIcon className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition drop-shadow-lg" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                  {session.title || session.video_id}
                </p>
                {session.channel_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.channel_name}</p>
                )}
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => onOpenSession(session)}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setActionTarget(session)}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                    title="Save to a course"
                  >
                    + Course
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition disabled:opacity-50"
                    title="Delete session"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {actionTarget && (
        <ActionModal
          session={actionTarget}
          courses={courses}
          onClose={() => setActionTarget(null)}
          onDone={(msg) => {
            toast.success(msg);
            setActionTarget(null);
          }}
        />
      )}
    </div>
  );
};
