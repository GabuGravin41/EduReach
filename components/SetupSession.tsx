import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import apiClient from '../src/services/api';

interface SetupSessionProps {
  onSessionCreated: (youtubeId: string, transcript: string) => void;
}

export const SetupSession: React.FC<SetupSessionProps> = ({ onSessionCreated }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchTranscript = async (url: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('/youtube/extract-transcript/', { url });
      
      if (response.data.success) {
        const transcriptText = response.data.transcript.transcript;
        setTranscript(transcriptText);
        setError('');
        return transcriptText;
      } else {
        setError(response.data.error || 'Failed to fetch transcript');
        return null;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch transcript. You can enter it manually.';
      setError(errorMsg);
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
        await fetchTranscript(url);
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
    if (!transcript.trim() && autoFetchEnabled) {
      const fetchedTranscript = await fetchTranscript(youtubeUrl);
      if (fetchedTranscript) {
        onSessionCreated(videoId, fetchedTranscript);
        return;
      }
    }
    
    if (!transcript.trim()) {
      setError('Please provide a transcript for the video or enable auto-fetch.');
      return;
    }
    
    onSessionCreated(videoId, transcript);
  };

  const handleExampleClick = () => {
    onSessionCreated('zNzzGgr2mhk', `(upbeat music) - Hey, it's-a me, Mario...`);
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="text-center p-8 max-w-2xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/5">
        <SparklesIcon className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Start a New Learning Session
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Paste a YouTube URL - transcript will be fetched automatically!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isLoading}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              </div>
            )}
          </div>
          
          {/* Show transcript preview if fetched */}
          {transcript && (
            <div className="text-left">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ✓ Transcript Fetched ({transcript.split(' ').length} words)
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
            <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
              Or enter transcript manually
            </summary>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full video transcript here..."
              rows={6}
              className="w-full mt-2 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </details>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !youtubeUrl.trim()}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Fetching Transcript...' : 'Start Session'}
          </button>
        </form>
        <div className="mt-6 text-sm">
            <p className="text-slate-500 dark:text-slate-400">
                Don't have a URL? <button type="button" onClick={handleExampleClick} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Use an example video</button>
            </p>
        </div>
      </div>
    </div>
  );
};
