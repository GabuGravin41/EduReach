import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../src/services/apiClient';

interface Assessment {
  id: number;
  title: string;
}

interface SessionSummary {
  id: number;
  pin: string;
  title: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  assessment: Assessment;
  attempt_count: number;
}

interface AttemptResult {
  id: number;
  display_name: string;
  score: string;
  percentage: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  question_results: Record<string, any>;
}

interface SessionDetail {
  session: SessionSummary & { assessment: Assessment };
  attempts: AttemptResult[];
}

function CopyPinButton({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(pin).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={copy} className="ml-2 text-xs text-indigo-600 hover:underline">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CreateSessionModal({ assessments, onClose, onCreated }: {
  assessments: Assessment[];
  onClose: () => void;
  onCreated: (session: SessionSummary) => void;
}) {
  const [assessmentId, setAssessmentId] = useState('');
  const [title, setTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState('');

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/api/assessments/exam-sessions/create/', data).then(r => r.data),
    onSuccess: (data) => onCreated(data),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Exam Session</h3>

        {mutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {(mutation.error as any)?.response?.data?.error || 'Failed to create session'}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment *</label>
            <select
              value={assessmentId}
              onChange={e => setAssessmentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select an assessment...</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Period 3 — Friday Quiz"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-expire after (minutes, optional)</label>
            <input
              type="number"
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              placeholder="e.g. 60"
              min={5}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({ assessment_id: assessmentId, title, expires_in_minutes: expiresIn || undefined })}
            disabled={!assessmentId || mutation.isPending}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ session, onClose }: { session: SessionDetail; onClose: () => void }) {
  const submitted = session.attempts.filter(a => a.status === 'submitted');
  const avg = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + a.percentage, 0) / submitted.length)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{session.session.title}</h3>
            <p className="text-sm text-gray-500">PIN: {session.session.pin} · {submitted.length} submitted · Avg {avg}%</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {session.attempts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.attempts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{a.display_name}</p>
                    <p className="text-xs text-gray-400">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'In progress'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{a.percentage}%</p>
                    <p className="text-xs text-gray-500">{a.score}</p>
                  </div>
                  <div className={`ml-4 w-2 h-2 rounded-full ${a.status === 'submitted' ? 'bg-green-500' : 'bg-amber-400'}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExamSessionsPage({ userAssessments }: { userAssessments?: Assessment[] }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewingResults, setViewingResults] = useState<SessionDetail | null>(null);
  const [loadingResultsId, setLoadingResultsId] = useState<number | null>(null);

  const { data: sessions = [], isLoading } = useQuery<SessionSummary[]>({
    queryKey: ['exam-sessions'],
    queryFn: () => apiClient.get('/api/assessments/exam-sessions/mine/').then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/api/assessments/exam-sessions/${id}/toggle/`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-sessions'] }),
  });

  const loadResults = async (id: number) => {
    setLoadingResultsId(id);
    try {
      const res = await apiClient.get(`/api/assessments/exam-sessions/${id}/results/`);
      setViewingResults(res.data);
    } finally {
      setLoadingResultsId(null);
    }
  };

  const joinUrl = (pin: string) => `${window.location.origin}/join?pin=${pin}`;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Sessions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Share a PIN — students join without accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>

      {/* How it works banner */}
      <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3">
        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-800">
          Create a session, share the PIN (or link) with your class. Students go to <strong>/join</strong>, enter the PIN and a display name — no account needed. Results appear here in real time.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔑</div>
          <p className="font-semibold text-gray-700">No sessions yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first session to get a shareable PIN</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <h3 className="font-semibold text-gray-900 truncate">{s.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{s.assessment.title}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-mono font-bold text-indigo-700 tracking-widest">{s.pin}</span>
                      <CopyPinButton pin={s.pin} />
                    </div>
                    <a
                      href={joinUrl(s.pin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline truncate max-w-[200px]"
                    >
                      {joinUrl(s.pin)}
                    </a>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {s.attempt_count} attempt{s.attempt_count !== 1 ? 's' : ''}
                    {s.expires_at ? ` · expires ${new Date(s.expires_at).toLocaleString()}` : ''}
                  </p>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => loadResults(s.id)}
                    disabled={loadingResultsId === s.id}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    {loadingResultsId === s.id ? '...' : 'Results'}
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(s.id)}
                    disabled={toggleMutation.isPending}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium ${s.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                  >
                    {s.is_active ? 'Close' : 'Reopen'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          assessments={userAssessments || []}
          onClose={() => setShowCreate(false)}
          onCreated={(session) => {
            qc.invalidateQueries({ queryKey: ['exam-sessions'] });
            setShowCreate(false);
          }}
        />
      )}

      {viewingResults && (
        <ResultsPanel session={viewingResults} onClose={() => setViewingResults(null)} />
      )}
    </div>
  );
}
