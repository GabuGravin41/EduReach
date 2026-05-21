import React, { useState, useRef, useEffect } from 'react';
import apiClient, { aiClient } from '../src/services/api';
import { assessmentService } from '../src/services/assessmentService';
import type { Unit } from '../src/services/curriculumService';

interface AddPaperModalProps {
  unit: Unit;
  onClose: () => void;
  onAdded: (assessmentId: number) => void;
}

type Mode = 'paste' | 'pdf';
type Stage = 'input' | 'working' | 'error';

export const AddPaperModal: React.FC<AddPaperModalProps> = ({ unit, onClose, onAdded }) => {
  const [mode, setMode] = useState<Mode>('pdf');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('input');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => { if (pollRef.current) window.clearTimeout(pollRef.current); }, []);

  const canSubmit = title.trim().length > 0 && (
    mode === 'paste' ? rawText.trim().length > 30 : !!pdfFile
  );

  const fail = (msg: string) => { setStage('error'); setErrorMsg(msg); };

  // ── Paste flow: AI parses pasted text, saved immediately ────────────────────
  const submitPaste = async () => {
    try {
      const parseRes = await aiClient.post(
        'ai/parse-questions/',
        { raw_text: rawText.trim(), topic: unit.name },
        { timeout: 90000 },
      );
      const questions = Array.isArray(parseRes.data?.questions) ? parseRes.data.questions : [];
      if (questions.length === 0) {
        fail('The AI could not find any questions in that text. Check it and try again.');
        return;
      }
      const assessment = await assessmentService.createAssessment({
        title: title.trim(),
        topic: unit.name,
        assessment_type: 'exam',
        is_public: true,
        unit: unit.id,
        questions_data: questions,
        time_limit_minutes: parseRes.data?.suggested_time_minutes ?? 60,
      });
      onAdded(assessment.id);
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      fail(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
    }
  };

  // ── PDF flow: upload, then poll the background extraction job ────────────────
  const pollJob = (jobId: number) => {
    apiClient.get(`curriculum/extraction-jobs/${jobId}/`)
      .then(res => {
        const job = res.data;
        if (job.status === 'done' && job.assessment) {
          onAdded(job.assessment);
        } else if (job.status === 'failed') {
          fail(job.error || 'The PDF could not be processed.');
        } else {
          setProgressMsg(job.progress || 'Processing…');
          pollRef.current = window.setTimeout(() => pollJob(jobId), 3000);
        }
      })
      .catch(() => {
        pollRef.current = window.setTimeout(() => pollJob(jobId), 4000);
      });
  };

  const submitPdf = async () => {
    try {
      const form = new FormData();
      form.append('pdf', pdfFile as File);
      form.append('title', title.trim());
      const res = await apiClient.post(
        `curriculum/units/${unit.id}/extract-paper/`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
      );
      setProgressMsg('Reading the PDF…');
      pollJob(res.data.id);
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      fail(typeof detail === 'string' ? detail : 'Upload failed. Please try again.');
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setStage('working');
    setErrorMsg('');
    if (mode === 'paste') void submitPaste();
    else void submitPdf();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Add a past paper</h2>
            <p className="text-xs text-slate-400 mt-0.5">to {unit.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {stage === 'working' ? (
          <div className="p-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {mode === 'pdf'
                ? (progressMsg || 'Processing the PDF…')
                : 'Reading the paper and structuring its questions…'}
            </p>
            <p className="text-xs text-slate-400">
              {mode === 'pdf'
                ? 'Extracting questions and diagrams — this can take a minute or two.'
                : 'This usually takes 10–30 seconds.'}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {stage === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2">
              {([['pdf', 'Upload PDF'], ['paste', 'Paste text']] as [Mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    mode === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Paper title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${unit.name} — 2023 End of Semester`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {mode === 'pdf' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  PDF file
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The AI reads the paper, extracts every question and crops any
                  circuit diagrams or figures. Max 25 MB.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Paste the paper
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  placeholder={'Paste the full paper text here — questions and answers in any format.'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>
            )}

            <p className="text-xs text-slate-400">
              It will be saved to this unit and shared with other students studying it.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Add paper
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
