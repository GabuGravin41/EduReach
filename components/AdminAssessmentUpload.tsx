import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../src/services/apiClient';
import { useToast } from '../src/contexts/ToastContext';
import { ASSESSMENT_KEYS } from '../src/hooks/useAssessments';

interface Institution {
  id: number;
  name: string;
  domain: string;
}

interface ParsedQuestion {
  type: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  correct_answer: string;
  points: number;
  explanation: string;
}

type UploadMode = 'paste' | 'manual';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

export const AdminAssessmentUpload: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<UploadMode>('paste');

  // Common metadata fields
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [sourceYear, setSourceYear] = useState('');
  const [attribution, setAttribution] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(120);
  const [isPublic, setIsPublic] = useState(true);

  // Paste-mode state
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const { data: institutions = [] } = useQuery<Institution[]>({
    queryKey: ['institutions'],
    queryFn: async () => {
      const r = await apiClient.get('/api/users/institutions/');
      return r.data;
    },
    staleTime: 60000,
  });

  const createInstMutation = useMutation({
    mutationFn: async (name: string) => {
      const r = await apiClient.post('/api/users/institutions/', { name });
      return r.data as Institution;
    },
    onSuccess: (inst) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      setInstitutionId(String(inst.id));
      setNewInstitution('');
      toast.success(`Institution "${inst.name}" created.`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await apiClient.post('/api/assessments/assessments/', payload);
      return r.data;
    },
    onSuccess: (data) => {
      toast.success(`"${data.title}" saved to the library.`);
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.title?.[0] || err?.response?.data?.detail || 'Upload failed.';
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setTitle(''); setTopic(''); setDescription(''); setInstitutionId('');
    setSourceYear(''); setAttribution(''); setTags([]); setRawText('');
    setParsedQuestions([]); setTimeLimit(120);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const parseQuestions = async () => {
    if (!rawText.trim()) { toast.error('Paste some question text first.'); return; }
    setIsParsing(true);
    try {
      const r = await apiClient.post('/api/ai/parse-questions/', { text: rawText });
      const questions: ParsedQuestion[] = (r.data?.questions || []).map((q: any) => ({
        type: q.type || q.question_type || 'short_answer',
        question_text: q.question_text || q.question || '',
        options: q.options || [],
        correct_answer_index: q.correct_answer_index ?? 0,
        correct_answer: q.correct_answer || '',
        points: q.points || 1,
        explanation: q.explanation || '',
      }));
      if (questions.length === 0) {
        toast.error('AI could not parse any questions. Try formatting your text more clearly.');
      } else {
        setParsedQuestions(questions);
        toast.success(`${questions.length} question${questions.length > 1 ? 's' : ''} parsed — review and save.`);
      }
    } catch {
      toast.error('Parsing failed. Check your connection and try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const resolveInstitution = async (): Promise<number | null> => {
    if (institutionId) return parseInt(institutionId);
    if (newInstitution.trim()) {
      const inst = await createInstMutation.mutateAsync(newInstitution.trim());
      return inst.id;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim()) { toast.error('Title and topic are required.'); return; }
    if (mode === 'paste' && parsedQuestions.length === 0) { toast.error('Parse your questions first.'); return; }

    const instId = await resolveInstitution().catch(() => null);

    const payload: any = {
      title: title.trim(),
      topic: topic.trim(),
      description: description.trim(),
      time_limit_minutes: timeLimit,
      is_public: isPublic,
      results_visibility: 'opt_in_public',
      assessment_type: 'exam',
      tags,
      ...(instId ? { institution: instId } : {}),
      ...(sourceYear ? { source_year: parseInt(sourceYear) } : {}),
      ...(attribution.trim() ? { source_attribution: attribution.trim() } : {}),
    };

    if (mode === 'paste') {
      payload.questions_data = parsedQuestions.map(q => ({
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer_index: q.correct_answer_index,
        correct_answer: q.correct_answer,
        points: q.points,
        explanation: q.explanation,
      }));
    } else {
      payload.questions_data = [];
    }

    uploadMutation.mutate(payload);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Upload Past Paper / Assessment</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add past papers, institutional exams, or custom question banks to the library. Students can discover and attempt these.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
        {([['paste', '📋 Paste & AI Parse'], ['manual', '✏️ Metadata Only']] as [UploadMode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paste section */}
        {mode === 'paste' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 space-y-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Step 1 — Paste your questions</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Paste the raw text of the exam questions. AI will detect question types (MCQ, short answer, essay) and structure them automatically.
            </p>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={10}
              placeholder={"1. What is the capital of Kenya?\n   a) Nairobi\n   b) Mombasa\n   c) Kisumu\n   Answer: a\n\n2. Describe photosynthesis in 3 sentences.\n..."}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
            <button
              type="button"
              onClick={parseQuestions}
              disabled={!rawText.trim() || isParsing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {isParsing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Parsing with AI...</>
              ) : (
                <><span>✨</span> Parse Questions</>
              )}
            </button>

            {parsedQuestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  ✓ {parsedQuestions.length} questions parsed — review below, then fill metadata and save.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {parsedQuestions.map((q, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-900 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 uppercase">{q.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{q.question_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {mode === 'paste' ? 'Step 2 — ' : ''}Paper metadata
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. KU Engineering Maths 2023 Final" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Subject / Topic *</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g. Calculus, Biology, Economics" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of the paper..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Institution</label>
              <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select or add new…</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            {!institutionId && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Or add new institution</label>
                <input value={newInstitution} onChange={e => setNewInstitution(e.target.value)} placeholder="e.g. Kenyatta University" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Year</label>
              <select value={sourceYear} onChange={e => setSourceYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select year…</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Time Limit (min)</label>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={5} max={600} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Public (discoverable)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Attribution / Credit line</label>
            <input value={attribution} onChange={e => setAttribution(e.target.value)} placeholder='e.g. "Kenyatta University — Engineering, 2023 Final Exam"' className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Tags <span className="font-normal normal-case">(Enter or comma)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                placeholder="e.g. calculus, engineering, kcse"
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="button" onClick={addTag} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full border border-indigo-200 dark:border-indigo-700">
                    {t}
                    <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-rose-500 font-bold">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploadMutation.isPending || (mode === 'paste' && parsedQuestions.length === 0) || !title.trim() || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-sm"
        >
          {uploadMutation.isPending ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving to library...</>
          ) : (
            <>Save to Assessment Library ({mode === 'paste' ? `${parsedQuestions.length} questions` : 'metadata only'})</>
          )}
        </button>
        {mode === 'manual' && (
          <p className="text-xs text-center text-slate-400">Saving metadata only — you can add questions later by editing the assessment.</p>
        )}
      </form>
    </div>
  );
};
