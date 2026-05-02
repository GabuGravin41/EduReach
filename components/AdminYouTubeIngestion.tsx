import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../src/services/apiClient';
import { useToast } from '../src/contexts/ToastContext';

interface IngestedVideo {
  id: number;
  video_id: string;
  url: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  concepts: string[];
  topic_tags: string[];
  is_processed: boolean;
  transcript_length: number;
  fetched_at: string | null;
}

interface IngestResult {
  status: 'ingested' | 'already_ingested';
  video_id: string;
  title: string;
  channel?: string;
  summary?: string;
  concepts: string[];
  tags: string[];
  transcript_length?: number;
}

const INGEST_KEY = ['admin', 'youtube', 'ingested'];

export const AdminYouTubeIngestion: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<IngestResult | null>(null);
  const [search, setSearch] = useState('');

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: [...INGEST_KEY, search],
    queryFn: async () => {
      const resp = await apiClient.get('admin/youtube/ingested/', { params: { q: search, limit: 30 } });
      return resp.data as { results: IngestedVideo[]; total: number };
    },
    staleTime: 30000,
  });

  const ingestMutation = useMutation({
    mutationFn: async (payload: { url: string; tags: string[] }) => {
      const resp = await apiClient.post('admin/youtube/ingest/', payload);
      return resp.data as IngestResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (data.status === 'already_ingested') {
        toast.success(`Already in library: "${data.title}"`);
      } else {
        toast.success(`Ingested "${data.title}" — ${data.concepts.length} concepts extracted.`);
      }
      queryClient.invalidateQueries({ queryKey: INGEST_KEY });
      setUrl('');
      setTags([]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Ingestion failed. Check the URL and try again.';
      toast.error(msg);
    },
  });

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }, [tagInput, tags]);

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    ingestMutation.mutate({ url: url.trim(), tags });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">YouTube Content Ingestion</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pull transcripts and metadata from YouTube videos, extract key concepts with AI, and build the platform content library.
        </p>
      </div>

      {/* Ingest form */}
      <form onSubmit={handleIngest} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Ingest a video</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">YouTube URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Topic Tags <span className="font-normal normal-case text-slate-400">(Enter or comma to add)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. physics, kcse, form4"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={addTag} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full border border-indigo-200 dark:border-indigo-700">
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-rose-500">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!url.trim() || ingestMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {ingestMutation.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Ingesting... (transcript + AI concepts)
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Ingest Video
            </>
          )}
        </button>
      </form>

      {/* Last result */}
      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">{lastResult.title}</p>
              {lastResult.channel && <p className="text-xs text-emerald-600 dark:text-emerald-400">{lastResult.channel}</p>}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lastResult.status === 'ingested' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {lastResult.status === 'ingested' ? 'New' : 'Already existed'}
            </span>
          </div>
          {lastResult.summary && (
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed border-t border-emerald-200 dark:border-emerald-700 pt-3">{lastResult.summary}</p>
          )}
          {lastResult.concepts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1.5">Extracted Concepts</p>
              <div className="flex flex-wrap gap-1.5">
                {lastResult.concepts.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {lastResult.transcript_length != null && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Transcript: {lastResult.transcript_length.toLocaleString()} characters</p>
          )}
        </div>
      )}

      {/* Library list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
            Content Library
            {listData && <span className="ml-2 text-xs font-normal text-slate-400">({listData.total} videos)</span>}
          </h3>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or channel..."
            className="w-56 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {listLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !listData?.results?.length ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.806v6.388a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <p className="text-sm">{search ? 'No videos match your search.' : 'No videos ingested yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listData.results.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  className="w-full h-36 object-cover bg-slate-100 dark:bg-slate-700"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">{v.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{v.channel_name || 'Unknown channel'}</p>
                  {v.concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.concepts.slice(0, 4).map((c, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">{c}</span>
                      ))}
                      {v.concepts.length > 4 && <span className="text-[10px] text-slate-400">+{v.concepts.length - 4}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>{v.transcript_length.toLocaleString()} chars</span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 hover:underline"
                    >
                      YouTube ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
