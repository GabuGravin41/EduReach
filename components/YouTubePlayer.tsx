import React from 'react';

interface YouTubePlayerProps {
  videoId: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg shadow-slate-900/5 w-full h-full">
      <iframe
        className="w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};