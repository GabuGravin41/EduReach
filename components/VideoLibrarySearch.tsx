import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../src/services/api';

type VideoResult = {
  url: string;
  title: string;
  video_id: string;
  transcript?: string;
  thumbnail_url?: string;
  channel_name?: string;
  cached?: boolean;
};

interface Props {
  courseId: number;
  lessonId?: number | null;
  onSelect: (video: VideoResult) => void;
}

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

const VideoLibrarySearch: React.FC<Props> = ({ courseId, lessonId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get(`videos/search/?q=${encodeURIComponent(query)}&limit=12`);
        const data = resp.data as any;
        setResults(Array.isArray(data.results) ? (data.results as VideoResult[]) : []);
      } catch (err: any) {
        setError(err?.response?.data?.error || err.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query]);

  const cachedCount = results.filter(r => r.cached).length;
  const liveCount = results.filter(r => !r.cached).length;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <span className="text-slate-400 flex-shrink-0"><SearchIcon /></span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search YouTube (e.g. 'linear algebra')"
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1 transition-colors"
          >
            Clear
          </button>
        )}
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Status hint */}
      {!query && (
        <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
          Search any YouTube video — click a result to open it as a new learning session.
        </p>
      )}

      {error && (
        <p className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {/* Result counts */}
      {results.length > 0 && (
        <div className="flex items-center gap-3 px-3 pt-2 pb-1">
          {cachedCount > 0 && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {cachedCount} instant
            </span>
          )}
          {liveCount > 0 && (
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <YouTubeIcon />
              {liveCount} from YouTube
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.video_id}
              className="flex items-start gap-3 p-3 hover:bg-white dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => onSelect(r)}
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                {r.thumbnail_url ? (
                  <img src={r.thumbnail_url} alt={r.title} className="w-20 h-12 object-cover rounded-md" />
                ) : (
                  <div className="w-20 h-12 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center">
                    <YouTubeIcon />
                  </div>
                )}
                {r.cached && (
                  <span className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1 rounded">
                    AI READY
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                  {r.title}
                </p>
                {r.channel_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{r.channel_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {r.cached ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ⚡ Loads instantly
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                      <YouTubeIcon /> YouTube
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(r); }}
                    className="ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-0.5 rounded-full font-medium transition-colors"
                  >
                    Open →
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !loading && results.length === 0 && !error && (
        <p className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
          No results for "<span className="font-medium">{query}</span>" — try the URL field below to load any YouTube video.
        </p>
      )}
    </div>
  );
};

export default VideoLibrarySearch;
