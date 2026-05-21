import React, { useState, useMemo } from 'react';
import { useAssessments } from '../src/hooks/useAssessments';
import { useAttachAssessment, useDetachAssessment } from '../src/hooks/useCurriculum';
import type { Unit } from '../src/services/curriculumService';

interface AttachAssessmentModalProps {
  unit: Unit;
  onClose: () => void;
}

export const AttachAssessmentModal: React.FC<AttachAssessmentModalProps> = ({ unit, onClose }) => {
  const { data: assessments = [], isLoading } = useAssessments();
  const attach = useAttachAssessment(unit.id);
  const detach = useDetachAssessment(unit.id);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Set<number>>(new Set());

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? assessments.filter(a =>
          a.title.toLowerCase().includes(q) || (a.topic || '').toLowerCase().includes(q))
      : assessments;
    return list.slice(0, 60);
  }, [assessments, search]);

  const toggle = (id: number, attached: boolean) => {
    setPending(p => new Set(p).add(id));
    const done = () => setPending(p => { const n = new Set(p); n.delete(id); return n; });
    if (attached) detach.mutate(id, { onSettled: done });
    else attach.mutate(id, { onSettled: done });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Tag an assessment
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">to {unit.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assessments by title or topic…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No assessments match that search.</p>
          ) : (
            results.map(a => {
              const attached = a.unit === unit.id;
              const busy = pending.has(a.id);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {a.topic}{a.question_count != null ? ` · ${a.question_count} questions` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(a.id, attached)}
                    disabled={busy}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex-none transition-colors disabled:opacity-60 ${
                      attached
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    {busy ? '…' : attached ? 'Tagged ✓' : 'Tag'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
