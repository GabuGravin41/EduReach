import React, { useState } from 'react';
import { aiClient } from '../src/services/api';
import { assessmentService } from '../src/services/assessmentService';
import type { Unit } from '../src/services/curriculumService';

interface AddPaperModalProps {
  unit: Unit;
  onClose: () => void;
  onAdded: (assessmentId: number) => void;
}

type Stage = 'input' | 'working' | 'error';

export const AddPaperModal: React.FC<AddPaperModalProps> = ({ unit, onClose, onAdded }) => {
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = title.trim().length > 0 && rawText.trim().length > 30;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStage('working');
    setErrorMsg('');
    try {
      // 1. AI parses the pasted text into structured questions.
      const parseRes = await aiClient.post(
        'ai/parse-questions/',
        { raw_text: rawText.trim(), topic: unit.name },
        { timeout: 90000 },
      );
      const questions = Array.isArray(parseRes.data?.questions) ? parseRes.data.questions : [];
      if (questions.length === 0) {
        setStage('error');
        setErrorMsg('The AI could not find any questions in that text. Check the paper content and try again.');
        return;
      }

      // 2. Save as an Assessment attached to this unit, public so peers benefit.
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
      setStage('error');
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      setErrorMsg(
        typeof detail === 'string'
          ? detail
          : 'Something went wrong adding the paper. Please try again.',
      );
    }
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
              Reading the paper and structuring its questions&hellip;
            </p>
            <p className="text-xs text-slate-400">This usually takes 10&ndash;30 seconds.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {stage === 'error' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

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

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Paste the paper
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={9}
                placeholder={'Paste the full paper text here — questions, options, and answers in any format.\n\nThe AI detects question types and structures them automatically.'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                It will be saved to this unit and shared with other students studying it.
              </p>
            </div>

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
