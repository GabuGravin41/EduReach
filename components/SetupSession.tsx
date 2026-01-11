import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import apiClient from '../src/services/api';
import { Button } from './ui/Button';
import type { Course } from '../src/services/courseService';

interface SetupSessionProps {
  onSessionCreated: (payload: { videoId: string; transcript: string; title?: string; courseId?: number | null }) => Promise<void> | void;
  courses?: Course[];
}

export const SetupSession: React.FC<SetupSessionProps> = ({ onSessionCreated, courses = [] }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('none');
  const [language, setLanguage] = useState('en');
  const [statusMessage, setStatusMessage] = useState('');

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchTranscript = async (url: string, lang: string = language) => {
    setIsLoading(true);
    setError('');
    setStatusMessage('Fetching transcript...');
    
    try {
      const response = await apiClient.post('/youtube/extract-transcript/', { url, language: lang });
      const data = response.data as any;
      
      if (data.success) {
        const transcriptText = data.transcript.transcript;
        setTranscript(transcriptText);
        if (!sessionTitle && data.metadata?.title) {
          setSessionTitle(data.metadata.title);
        }
        setError('');
        setStatusMessage(`Transcript ready (${data.transcript.language?.toUpperCase() || lang.toUpperCase()})`);
        return transcriptText;
      } else {
        setError(data.error || 'Failed to fetch transcript');
        setStatusMessage('');
        return null;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch transcript. You can enter it manually.';
      setError(errorMsg);
      setStatusMessage('');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    
    // Auto-fetch transcript when valid URL is entered
    if (autoFetchEnabled && url.trim()) {
      const videoId = extractVideoId(url);
      if (videoId) {
        await fetchTranscript(url, language);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    
    // If no transcript yet, try to fetch it
    let finalTranscript = transcript;
    if (!transcript.trim() && autoFetchEnabled) {
      const fetchedTranscript = await fetchTranscript(youtubeUrl, language);
      if (fetchedTranscript) {
        finalTranscript = fetchedTranscript;
      } else {
        finalTranscript = '[Transcript could not be automatically extracted. You can provide it manually in the learning session.]';
      }
    }
    
    // Validate that we have either video ID or transcript
    if (!videoId && !finalTranscript.trim()) {
      setError('Please enter a valid YouTube URL or transcript.');
      return;
    }
    
    // Call backend to save session to course
    setIsLoading(true);
    try {
      const courseId = selectedCourseId !== 'none' ? Number(selectedCourseId) : undefined;
      
      console.log('Starting session with:', { videoId, courseId, title: sessionTitle });
      
      const response = await apiClient.post('/courses/start_session/', {
        title: sessionTitle || 'Learning Session',
        video_id: videoId,
        video_url: youtubeUrl,
        transcript: finalTranscript,
        transcript_language: language,
        course_id: courseId
      });
      
      console.log('Session response:', response.data);
      
      const data = response.data;
      if (data.success && data.lesson) {
        // Session created successfully on backend, now load it in UI
        console.log('Session created, navigating to learning session');
        await onSessionCreated({
          videoId,
          transcript: finalTranscript,
          title: sessionTitle || 'Learning Session',
          courseId: data.course?.id,
          lessonId: data.lesson.id
        });
      } else {
        const errorMsg = data.error || 'Failed to start session';
        console.error('Session creation failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Failed to start session:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to start session. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = () => {
    onSessionCreated({
        videoId: 'zNzzGgr2mhk', 
        transcript: `(upbeat music) - Hey, it's-a me, Mario...`,
        title: 'Example Session'
    });
  }

  return (
    <div className="flex items-center justify-center min-h-full p-4">
      <div className="text-center p-8 max-w-2xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5 border border-slate-200 dark:border-slate-700">
        <SparklesIcon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Start a New Learning Session
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Paste a YouTube URL - transcript will be fetched automatically!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-left">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                Transcript language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
                <option value="pt">Portuguese</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mt-6">
              <input
                type="checkbox"
                checked={autoFetchEnabled}
                onChange={(e) => setAutoFetchEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-fetch transcript as you paste
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-left">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                Session title
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Linear Algebra basics"
                className="w-full p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-left">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                Save under course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Personal sessions (auto)</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                A private “Personal Sessions” course will be created if you leave this as default.
              </p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isLoading}
              className="w-full p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {statusMessage && (
            <div className="text-left text-xs text-blue-600 dark:text-emerald-300 font-medium">
              {statusMessage}
            </div>
          )}
          
          {/* Show transcript preview if fetched */}
          {transcript && (
            <div className="text-left">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ✓ Transcript Ready ({transcript.split(' ').length} words)
                </label>
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 max-h-32 overflow-y-auto text-sm text-slate-600 dark:text-slate-400">
                {transcript.substring(0, 200)}...
              </div>
            </div>
          )}
          
          {/* Manual transcript input (optional) */}
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium">
              Or enter transcript manually
            </summary>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full video transcript here..."
              rows={6}
              className="w-full mt-2 p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </details>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <Button
            type="submit"
            disabled={isLoading || !youtubeUrl.trim() && !transcript.trim()}
            className="w-full justify-center bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 border-none text-white py-3"
            isLoading={isLoading}
          >
            {isLoading ? 'Fetching Transcript...' : 'Start Session'}
          </Button>
        </form>
        <div className="mt-6 text-sm">
            <p className="text-slate-500 dark:text-slate-400">
                Don't have a URL? <button type="button" onClick={handleExampleClick} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Use an example video</button>
            </p>
        </div>
      </div>
    </div>
  );
};
