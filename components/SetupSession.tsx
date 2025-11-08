import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface SetupSessionProps {
  onSessionCreated: (youtubeId: string, transcript: string) => void;
}

export const SetupSession: React.FC<SetupSessionProps> = ({ onSessionCreated }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    if (!transcript.trim()) {
        setError('Please provide a transcript for the video.');
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
          Paste a YouTube URL and its transcript below to begin.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the full video transcript here..."
            rows={8}
            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300"
          >
            Start Session
          </button>
        </form>
        <div className="mt-6 text-sm">
            <p className="text-slate-500 dark:text-slate-400">
                Don't have a URL? <button onClick={handleExampleClick} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Use an example video</button>
            </p>
        </div>
      </div>
    </div>
  );
};
