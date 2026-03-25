import React, { useState, useEffect } from 'react';
import apiClient from '../src/services/api';
import type { Course } from '../src/services/courseService';

interface SetupSessionProps {
  onSessionCreated: (payload: { videoId: string; transcript: string; title?: string; courseId?: number | null; lessonId?: number }) => Promise<void> | void;
  courses?: Course[];
}

// ── Small inline icons ────────────────────────────────────────────────────────

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
  </svg>
);

const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
    <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
    <path d="M6 18a4 4 0 0 1-1.967-.516"/>
    <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
  </svg>
);

const PlayCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z" clipRule="evenodd" />
  </svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

const PasteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M7 3.5A1.5 1.5 0 018.5 2h3A1.5 1.5 0 0113 3.5v1A1.5 1.5 0 0111.5 6h-3A1.5 1.5 0 017 4.5v-1z"/>
    <path d="M6.5 4H5A1.5 1.5 0 003.5 5.5v11A1.5 1.5 0 005 18h10a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0015 4h-1.5a.5.5 0 010 1h1.5a.5.5 0 01.5.5v11a.5.5 0 01-.5.5H5a.5.5 0 01-.5-.5v-11A.5.5 0 015 5h1.5a.5.5 0 010-1z"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const SetupSession: React.FC<SetupSessionProps> = ({ onSessionCreated, courses = [] }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchEnabled] = useState(true);
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('none');
  const [language, setLanguage] = useState('en');
  const [statusMessage, setStatusMessage] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ title?: string } | null>(null);
  const [showCourseAttach, setShowCourseAttach] = useState(false);
  const [showManualTranscript, setShowManualTranscript] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchTranscript = async (url: string, lang: string = language) => {
    setIsLoading(true);
    setError('');

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [3000, 6000, 10000];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        setRetryAttempt(attempt);
        setStatusMessage(`Retrying transcript fetch (${attempt}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1] || 5000));
      } else {
        setRetryAttempt(0);
        setStatusMessage('Extracting knowledge from video...');
      }

      try {
        const response = await apiClient.post('/youtube/extract-transcript/', { url, language: lang });
        const data = response.data as any;

        if (data.success) {
          const transcriptText = data.transcript.timestamped_transcript || data.transcript.transcript;
          setTranscript(transcriptText);
          if (data.metadata?.title) {
            setVideoMeta({ title: data.metadata.title });
            if (!sessionTitle) setSessionTitle(data.metadata.title);
          }
          setError('');
          setStatusMessage(`Transcript ready (${data.transcript.language?.toUpperCase() || lang.toUpperCase()})`);
          setIsLoading(false);
          setRetryAttempt(0);
          return transcriptText;
        }
        if (attempt === MAX_RETRIES) {
          setError(data.error || 'Failed to fetch transcript');
          setStatusMessage('');
          setIsLoading(false);
          setRetryAttempt(0);
          return null;
        }
      } catch (err: any) {
        if (attempt === MAX_RETRIES) {
          const errorMsg = err.response?.data?.error || 'Failed to fetch transcript. You can enter it manually.';
          setError(errorMsg);
          setStatusMessage('');
          setIsLoading(false);
          setRetryAttempt(0);
          return null;
        }
      }
    }

    setIsLoading(false);
    setRetryAttempt(0);
    return null;
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    const vid = extractVideoId(url);
    setVideoId(vid);
    if (vid) {
      setVideoMeta(null);
    }

    if (autoFetchEnabled && url.trim() && vid) {
      await fetchTranscript(url, language);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const vid = extractVideoId(youtubeUrl);
    if (!vid) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }

    let finalTranscript = transcript;
    if (!transcript.trim() && autoFetchEnabled) {
      const fetchedTranscript = await fetchTranscript(youtubeUrl, language);
      if (fetchedTranscript) {
        finalTranscript = fetchedTranscript;
      } else {
        finalTranscript = '[Transcript could not be automatically extracted. You can provide it manually in the learning session.]';
      }
    }

    if (!vid && !finalTranscript.trim()) {
      setError('Please enter a valid YouTube URL or transcript.');
      return;
    }

    setIsLoading(true);
    try {
      const courseId = selectedCourseId !== 'none' ? Number(selectedCourseId) : undefined;

      const response = await apiClient.post('/courses/start_session/', {
        title: sessionTitle || 'Learning Session',
        video_id: vid,
        video_url: youtubeUrl,
        transcript: finalTranscript,
        transcript_language: language,
        course_id: courseId,
      });

      const data = response.data;
      if (data.success && data.lesson) {
        await onSessionCreated({
          videoId: vid,
          transcript: finalTranscript,
          title: sessionTitle || 'Learning Session',
          courseId: data.course?.id,
          lessonId: data.lesson.id,
        });
      } else {
        setError(data.error || 'Failed to start session');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to start session. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryWithoutTranscript = async () => {
    const vid = extractVideoId(youtubeUrl);
    if (!vid) {
      setError('Please enter a valid YouTube video URL first.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const courseId = selectedCourseId !== 'none' ? Number(selectedCourseId) : undefined;
      const response = await apiClient.post('/courses/start_session/', {
        title: sessionTitle || 'Learning Session',
        video_id: vid,
        video_url: youtubeUrl,
        transcript: '[Transcript unavailable]',
        transcript_language: language,
        course_id: courseId,
      });
      const data = response.data;
      if (data.success && data.lesson) {
        await onSessionCreated({
          videoId: vid,
          transcript: '[Transcript unavailable]',
          title: sessionTitle || 'Learning Session',
          courseId: data.course?.id,
          lessonId: data.lesson.id,
        });
      } else {
        setError(data.error || 'Failed to start session');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to start session.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = () => {
    onSessionCreated({
      videoId: 'zNzzGgr2mhk',
      transcript: `(upbeat music) - Hey, it's-a me, Mario...`,
      title: 'Example Session',
    });
  };

  // ── Derived UI state ──────────────────────────────────────────────────────

  const hasValidUrl = !!videoId;
  const hasTranscript = !!transcript.trim();
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  const isTranscriptLoading = isLoading && !hasTranscript;
  const isSubmitting = isLoading && hasTranscript;

  // Step 1: no url entered yet
  // Step 2: valid url, waiting for transcript (or transcript ready)
  // Step 3: loading transcript
  // Step 4: transcript ready — title editing + submit
  const step: 1 | 2 | 3 | 4 =
    !hasValidUrl ? 1 :
    isTranscriptLoading ? 3 :
    hasTranscript ? 4 :
    2;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center justify-center min-h-full p-4">
      <div className="w-full max-w-[560px]">

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">

          {/* Gradient header bar */}
          <div className="h-2 bg-gradient-to-r from-blue-600 to-emerald-600" />

          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <PlayCircleIcon />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                New Learning Session
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">
              Paste a YouTube URL and let AI extract the knowledge for you.
            </p>
          </div>

          {/* Card body */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">

            {/* ── URL INPUT ─────────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                YouTube URL
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <LinkIcon />
                </span>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isLoading}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-11 pr-12 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                />
                {/* Paste button */}
                {!youtubeUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) handleUrlChange(text);
                      } catch {
                        // clipboard not available
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition px-1"
                    title="Paste from clipboard"
                  >
                    <PasteIcon />
                    Paste
                  </button>
                )}
                {/* Spinner when loading */}
                {isLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* ── STEP 1 — "How it works" info cards ────────────────────── */}
            {step === 1 && (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">How it works</p>
                {[
                  { icon: <LinkIcon />, title: 'Paste a YouTube URL', desc: 'Any educational video works — lectures, tutorials, explainers.' },
                  { icon: <BrainIcon />, title: 'AI extracts knowledge', desc: 'We pull the transcript and build a smart study context.' },
                  { icon: <BookOpenIcon />, title: 'Start learning', desc: 'Chat with AI, take quizzes, and take notes — all linked to the video.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/30 dark:to-emerald-900/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 3 — Transcript loading animation ─────────────────── */}
            {step === 3 && (
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/20 p-5">
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900/50" />
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center">
                      <BrainIcon />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Extracting knowledge from video...</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {retryAttempt > 0 ? `Retry attempt ${retryAttempt} of 3` : 'This may take a moment'}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full animate-pulse"
                    style={{ width: retryAttempt > 0 ? `${33 * retryAttempt}%` : '60%' }}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2 / 4 — Video confirmed ──────────────────────────── */}
            {(step === 2 || step === 4) && thumbnailUrl && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Thumbnail strip */}
                <div className="relative">
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-36 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    {videoMeta?.title ? (
                      <p className="text-white text-sm font-semibold line-clamp-2 drop-shadow">{videoMeta.title}</p>
                    ) : (
                      <p className="text-white/70 text-xs">Video confirmed</p>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow">
                    <CheckIcon />
                    Valid URL
                  </div>
                </div>

                {/* Language + course row */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Transcript language</label>
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          disabled={isLoading}
                          className="w-full appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="hi">Hindi</option>
                          <option value="pt">Portuguese</option>
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <ChevronDownIcon />
                        </span>
                      </div>
                    </div>
                    {courses.length > 0 && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setShowCourseAttach(v => !v)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${showCourseAttach ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                          + Attach to course
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Course selector (expandable) */}
                  {showCourseAttach && courses.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Save under course</label>
                      <div className="relative">
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="none">Personal sessions (auto)</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <ChevronDownIcon />
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        A private "Personal Sessions" course is created if you leave this as default.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4 — Transcript ready + title ─────────────────────── */}
            {step === 4 && hasTranscript && (
              <>
                {/* Status message */}
                {statusMessage && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {statusMessage}
                  </div>
                )}

                {/* Session title */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Session title</label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g. Linear Algebra Basics"
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>

                {/* Transcript preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Transcript ready &mdash; {transcript.split(' ').length.toLocaleString()} words
                    </p>
                    <button
                      type="button"
                      onClick={() => setTranscript('')}
                      className="text-xs text-slate-400 hover:text-rose-500 transition"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 max-h-24 overflow-y-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {transcript.substring(0, 250)}…
                  </div>
                </div>
              </>
            )}

            {/* ── Loading status (non-transcript loading) ────────────────── */}
            {statusMessage && step !== 4 && (
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{statusMessage}</p>
            )}

            {/* ── ERROR BANNER ───────────────────────────────────────────── */}
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex gap-3">
                  <span className="text-red-500 dark:text-red-400 mt-0.5">
                    <AlertCircleIcon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Transcript extraction failed</p>
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    {hasValidUrl && (
                      <button
                        type="button"
                        onClick={handleTryWithoutTranscript}
                        disabled={isLoading}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                      >
                        Try anyway without transcript
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Manual transcript toggle ───────────────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => setShowManualTranscript(v => !v)}
                className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition"
              >
                <ChevronDownIcon />
                {showManualTranscript ? 'Hide' : 'Enter transcript manually'}
              </button>
              {showManualTranscript && (
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the full video transcript here..."
                  rows={5}
                  className="mt-2 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                />
              )}
            </div>

            {/* ── SUBMIT BUTTON ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading || (!youtubeUrl.trim() && !transcript.trim())}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  {isTranscriptLoading ? 'Fetching transcript...' : 'Starting session...'}
                </>
              ) : (
                <>
                  <PlayCircleIcon />
                  {step === 4 ? 'Launch Session' : 'Start Session'}
                </>
              )}
            </button>

          </form>

          {/* Card footer */}
          <div className="px-8 pb-6 -mt-2 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Don't have a URL?{' '}
              <button
                type="button"
                onClick={handleExampleClick}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Use an example video
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
