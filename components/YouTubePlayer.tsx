import { forwardRef } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  initialTime?: number;
  className?: string;
}

const YouTubePlayer = forwardRef<HTMLIFrameElement, YouTubePlayerProps>(
  ({ videoId, initialTime, className }, ref) => {
    return (
      <iframe
        ref={ref}
        className={className}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1${initialTime ? `&start=${Math.floor(initialTime)}` : ''}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
);

// Named export for components that need it
export { YouTubePlayer };

export default YouTubePlayer;