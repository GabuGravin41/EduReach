import React, { useMemo, useState } from 'react';
import { youtubeService } from '../src/services/youtubeService';
import apiClient from '../services/api';
import transcriptUtils from '../src/utils/transcript';

interface TranscriptListProps {
  rawTranscript: any;
  onSeek?: (seconds: number) => void;
}

const TranscriptList: React.FC<TranscriptListProps> = ({ rawTranscript, onSeek }) => {
  const { segments, chunks } = useMemo(() => youtubeService.processTranscriptRaw(rawTranscript), [rawTranscript]);
  const paragraphs = useMemo(() => transcriptUtils.formatSegmentsToParagraphs(segments || []), [segments]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunkSummaries, setChunkSummaries] = useState<any[] | null>(null);
  const [globalSummary, setGlobalSummary] = useState<string | null>(null);

  const handleClickTimestamp = (ms: number) => {
    if (!onSeek) return;
    onSeek(Math.floor(ms / 1000));
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  };

  const handleSummarize = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = { chunks: chunks.map((c: any) => c.text) };
      const resp = await apiClient.post('/ai/summarize-chunks/', payload);
      const data = resp.data;
      if (data?.success) {
        setChunkSummaries(data.chunk_summaries || []);
        setGlobalSummary(data.global_summary || null);
      } else {
        setError(data?.error || 'Summarization failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  if ((!segments || segments.length === 0) && (!paragraphs || paragraphs.length === 0)) {
    return <div className="text-sm text-slate-500">No transcript available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Transcript</h4>
        <div className="flex items-center gap-2">
          <button onClick={handleSummarize} disabled={loading || !chunks || chunks.length === 0} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Summarizing...' : 'Summarize' }
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto bg-white dark:bg-slate-800 p-3 rounded space-y-2 border border-slate-200 dark:border-slate-700">
        {paragraphs.map((p: any, i: number) => (
          <div key={i} className="mb-3">
            <div className="text-xs text-slate-400 mb-1">{formatMs(p.startMs)} — {formatMs(p.endMs)}</div>
            <div className="text-sm text-slate-800 dark:text-slate-200">{p.text}</div>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {chunkSummaries && (
        <div className="space-y-4">
          <h5 className="font-semibold">Chunk Summaries</h5>
          <div className="space-y-3">
            {chunkSummaries.map((c: any) => (
              <div key={c.index} className="p-3 bg-slate-50 dark:bg-slate-700 rounded">
                <div className="text-xs font-medium text-slate-500">Chunk {c.index + 1}</div>
                <pre className="whitespace-pre-wrap text-sm mt-1">{c.summary}</pre>
              </div>
            ))}
          </div>

          {globalSummary && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <div className="text-sm font-semibold mb-2">Global Summary</div>
              <div className="text-sm whitespace-pre-wrap">{globalSummary}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptList;
