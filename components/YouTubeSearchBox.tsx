/**
 * YouTubeSearchBox
 * ─────────────────
 * A self-contained search widget that queries the backend YouTube search
 * endpoint and lets the user pick a video.  Drop it anywhere a YouTube
 * URL / video-ID is collected.
 *
 * Props
 * ─────
 *  onSelect(result)  — called when the user clicks a result card.
 *                      result contains { video_id, title, channel,
 *                      duration, thumbnail_url, url }
 *  placeholder       — optional search box placeholder text
 *  className         — optional wrapper className
 */

import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../src/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface YouTubeSearchResult {
  video_id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail_url: string;
  url: string;
}

interface Props {
  onSelect: (result: YouTubeSearchResult) => void;
  placeholder?: string;
  className?: string;
}

// ── Inline icons ──────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
  </svg>
);

const YouTubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const YouTubeSearchBox: React.FC<Props> = ({
  onSelect,
  placeholder = 'Search YouTube — e.g. "calculus derivatives explained"',
  className = '',
}) => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched]     = useState(false);
  const [error, setError]           = useState('');
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Focus the input when mounted
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async (q: string = query) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setError('');
    setSearched(false);
    try {
      const res = await apiClient.get(
        `courses/search_youtube/?q=${encodeURIComponent(q.trim())}&limit=8`
      );
      const data = res.data as { results: YouTubeSearchResult[]; error?: string };
      setResults(data.results ?? []);
      if (!data.results?.length) {
        setError(data.error || 'No results found. Try different keywords.');
      }
    } catch {
      setError('Search failed. Try pasting a URL directly instead.');
      setResults([]);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError('');
    inputRef.current?.focus();
  };

  const handleSelect = (result: YouTubeSearchResult) => {
    onSelect(result);
    // Reset so the box is clean if reused
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className={`space-y-3 ${className}`}>

      {/* ── Search input row ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSearching}
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-9 pr-8 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none transition disabled:opacity-50"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <XIcon />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={!query.trim() || isSearching}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
        >
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <YouTubeIcon />
          )}
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* ── Note about Option B being temporary ──────────────────────── */}
      {/* TODO (Option A): Remove this notice once YouTube Data API v3 key is configured.
          The note is shown so users know search may be slow (yt-dlp scraping). */}
      {!searched && !isSearching && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Search uses web scraping and may take a few seconds.{' '}
          <span className="font-medium">Tip:</span> include the subject + level for better results.
        </p>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Results list ─────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/70 shadow-sm">
          {results.map((r) => (
            <button
              key={r.video_id}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-left transition group"
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-20 h-[45px] rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700">
                <img
                  src={r.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                  {r.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.channel}</p>
                  {r.duration && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{r.duration}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Select cue */}
              <span className="text-xs text-red-500 dark:text-red-400 font-semibold flex-shrink-0 opacity-0 group-hover:opacity-100 transition pr-1">
                Select →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
