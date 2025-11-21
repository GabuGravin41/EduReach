import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as GoogleYouTubePlayer } from 'react-youtube';

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
}

interface CustomYouTubePlayerProps extends Pick<YouTubeProps, 'onReady' | 'onStateChange'> {
  videoId: string;
  initialTime?: number;
  className?: string;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, CustomYouTubePlayerProps>(
  ({ videoId, initialTime = 0, className = '', onReady, onStateChange }, ref) => {
    const playerRef = useRef<GoogleYouTubePlayer | null>(null);

    const playerOptions = useMemo<YouTubeProps['opts']>(() => ({
      width: '100%',
      height: '100%',
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
      if (initialTime) {
        event.target.seekTo(initialTime, true);
      }
      onReady?.(event);
    };

    return (
      <div className={`relative w-full h-full ${className}`}>
        <YouTube
          videoId={videoId}
          opts={playerOptions}
          onReady={handleReady}
          onStateChange={onStateChange}
          className="h-full w-full"
        />
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

export { YouTubePlayer };

export default YouTubePlayer;