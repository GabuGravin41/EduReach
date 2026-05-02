import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../src/services/api';

type VideoResult = {
  url: string;
  title: string;
  video_id: string;
  transcript?: string;
  thumbnail_url?: string;
  channel_name?: string;
};

interface Props {
  courseId: number;
  lessonId?: number | null;
  onSelect: (video: VideoResult) => void;
}

const VideoLibrarySearch: React.FC<Props> = ({ courseId, lessonId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // Debounce user typing
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get(`videos/search/?q=${encodeURIComponent(query)}`);
        const data = resp.data as any;
        if (data && Array.isArray(data.results)) {
          setResults(data.results as VideoResult[]);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || err.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search our video library (e.g. 'machine learning')"
          className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
        />
        <button
          onClick={() => { setQuery(''); setResults([]); }}
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          Clear
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-2">Videos in our library load instantly with full AI support.</div>

      {loading && <div className="text-sm text-slate-500">Searching…</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.video_id} className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
            {r.thumbnail_url ? (
              <img src={r.thumbnail_url} alt={r.title} className="w-20 h-12 object-cover rounded" />
            ) : (
              <div className="w-20 h-12 bg-slate-200 dark:bg-slate-700 rounded" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.title}</div>
                <div className="flex items-center gap-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline">YouTube</a>
                  <button
                    onClick={() => onSelect(r)}
                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 rounded ml-2"
                  >
                    Load
                  </button>
                </div>
              </div>
              {r.channel_name && <div className="text-xs text-slate-500">{r.channel_name}</div>}
              {r.transcript && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{r.transcript.slice(0, 220)}{r.transcript.length > 220 ? '…' : ''}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VideoLibrarySearch;
