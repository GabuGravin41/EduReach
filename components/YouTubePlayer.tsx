import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as GoogleYouTubePlayer } from 'react-youtube';

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
  onReady?: YouTubeProps['onReady'];
  onStateChange?: YouTubeProps['onStateChange'];
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, CustomYouTubePlayerProps>(
  ({ videoId, initialTime = 0, className = '', onReady, onStateChange }, ref) => {
    const playerRef = useRef<GoogleYouTubePlayer | null>(null);

    // Options for filling the container
    const playerOptions = useMemo<YouTubeProps['opts']>(() => ({
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        start: Math.floor(initialTime),
      },
    }), [initialTime]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      pause: () => playerRef.current?.pauseVideo(),
      play: () => playerRef.current?.playVideo(),
    }), []);

    const handleReady: YouTubeProps['onReady'] = (event) => {
      playerRef.current = event.target;
      if (initialTime > 0) {
        event.target.seekTo(initialTime, true);
      }
      onReady?.(event);
    };

    return (
      <div className={`relative w-full h-full min-h-0 ${className}`}>
        <YouTube
          videoId={videoId}
          opts={playerOptions}
          onReady={handleReady}
          onStateChange={onStateChange}
          // The wrapper container from react-youtube
          className="w-full h-full"
          // The actual iframe
          iframeClassName="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

export { YouTubePlayer };

export default YouTubePlayer;
