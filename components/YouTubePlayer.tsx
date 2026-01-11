import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
}

interface CustomYouTubePlayerProps {
  videoId: string;
  initialTime?: number;
  className?: string;
  onReady?: () => void;
  onStateChange?: () => void;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, CustomYouTubePlayerProps>(
  ({ videoId, initialTime = 0, className = '', onReady, onStateChange }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            event: 'command',
            func: 'seekTo',
            args: [seconds, true]
          }, '*');
        }
      },
      getCurrentTime: () => 0,
      pause: () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            event: 'command',
            func: 'pauseVideo'
          }, '*');
        }
      },
      play: () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            event: 'command',
            func: 'playVideo'
          }, '*');
        }
      },
    }), []);

    useEffect(() => {
      // Signal ready after iframe mounts
      onReady?.();
    }, [videoId, onReady]);

    // Build the embed URL with nocookie domain to bypass consent banners
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${Math.floor(initialTime)}&autoplay=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

    const handleIframeError = () => {
      setLoadError(`Unable to load video (${videoId})`);
    };

    return (
      <div className={`relative w-full h-full min-h-0 ${className}`}>
        {!loadError ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={`YouTube video: ${videoId}`}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            onError={handleIframeError}
            onLoad={() => {
              setLoadError(null);
              onReady?.();
            }}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <div className="text-center p-6">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{loadError}</p>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
              >Watch on YouTube</a>
            </div>
          </div>
        )}
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

export { YouTubePlayer };

export default YouTubePlayer;
