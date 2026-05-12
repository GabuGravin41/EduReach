import { useState, useRef } from 'react';
import MathMarkdown from './MathMarkdown';
import apiClient from '../src/services/api';
import { useAuth } from '../src/contexts/useAuth';

interface EngineeringProblem {
  id: number;
  unit_code: string;
  unit_name: string;
  year: number | null;
  semester: number | null;
  paper_type: string;
  question_number: string;
  question_text: string;
  marks: string;
  question_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  has_diagram: boolean;
  diagram_url: string | null;
  diagram_description: string;
  model_solution: string;
  solution_status: 'pending' | 'generated' | 'verified';
}

interface Props {
  problem: EngineeringProblem;
}

const difficultyStyle: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const typeStyle: Record<string, string> = {
  calculation: 'bg-blue-100 text-blue-700',
  derivation: 'bg-purple-100 text-purple-700',
  explanation: 'bg-gray-100 text-gray-700',
  design: 'bg-orange-100 text-orange-700',
  proof: 'bg-indigo-100 text-indigo-700',
  sketch: 'bg-pink-100 text-pink-700',
  mcq: 'bg-teal-100 text-teal-700',
};

interface GradeResult {
  score: number;
  feedback: string;
  model_solution: string;
  solution_generated: boolean;
}

export function EngineeringProblemCard({ problem: initialProblem }: Props) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.tier === 'admin';

  const [problem, setProblem] = useState(initialProblem);
  const [showSolution, setShowSolution] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [answer, setAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradeError, setGradeError] = useState('');

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editDiagram, setEditDiagram] = useState<File | null>(null);
  const [removeDiagram, setRemoveDiagram] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSolution = !!problem.model_solution;
  const marksNum = parseInt(problem.marks) || 10;

  const startEdit = () => {
    setEditText(problem.question_text);
    setEditDiagram(null);
    setRemoveDiagram(false);
    setSaveError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditDiagram(null);
    setRemoveDiagram(false);
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const form = new FormData();
      form.append('question_text', editText);
      if (removeDiagram) {
        form.append('diagram_image', '');
      } else if (editDiagram) {
        form.append('diagram_image', editDiagram);
      }
      const res = await apiClient.patch(
        `engineering/problems/${problem.id}/`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      // Rebuild diagram_url from response
      const updated = res.data;
      setProblem(p => ({
        ...p,
        question_text: updated.question_text ?? editText,
        has_diagram: updated.has_diagram ?? p.has_diagram,
        diagram_url: updated.diagram_url ?? (removeDiagram ? null : p.diagram_url),
        diagram_description: updated.diagram_description ?? p.diagram_description,
      }));
      setImgError(false);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async () => {
    if (!answer.trim() || grading) return;
    setGrading(true);
    setGradeError('');
    setGradeResult(null);
    try {
      const res = await apiClient.post(`engineering/problems/${problem.id}/grade/`, {
        answer: answer.trim(),
      });
      const data: GradeResult = res.data;
      setGradeResult(data);
      // Cache the solution locally so the "Show solution" button works immediately
      if (data.model_solution && !problem.model_solution) {
        setProblem(p => ({ ...p, model_solution: data.model_solution, solution_status: 'generated' }));
      }
      setShowSolution(true);
    } catch (err: any) {
      setGradeError(err?.response?.data?.error || 'Grading failed. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const earnedMarks = gradeResult ? Math.round((gradeResult.score / 100) * marksNum) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-start gap-2">
        <span className="text-sm font-semibold text-gray-800">
          {problem.unit_code} — {problem.question_number}
        </span>
        <span className="text-sm text-gray-400">
          {problem.year}{problem.semester ? ` S${problem.semester}` : ''}{problem.paper_type ? ` · ${problem.paper_type}` : ''}
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end">
          {problem.marks && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {problem.marks} marks
            </span>
          )}
          {problem.question_type && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeStyle[problem.question_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {problem.question_type}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${difficultyStyle[problem.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
            {problem.difficulty}
          </span>
          {isAdmin && !editing && (
            <button
              onClick={startEdit}
              className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Question body */}
      <div className="px-5 pb-4">
        {editing ? (
          /* ── Inline editor ── */
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono"
            />

            {/* Diagram controls */}
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-600 mb-2">Diagram</p>

              {/* Current diagram preview */}
              {problem.has_diagram && problem.diagram_url && !removeDiagram && !editDiagram && !imgError && (
                <div className="flex items-start gap-3 mb-2">
                  <img
                    src={problem.diagram_url}
                    alt="Current diagram"
                    className="max-h-40 max-w-xs object-contain rounded border border-gray-200 bg-white"
                    onError={() => setImgError(true)}
                  />
                  <button
                    onClick={() => setRemoveDiagram(true)}
                    className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    Remove diagram
                  </button>
                </div>
              )}

              {removeDiagram && (
                <p className="text-xs text-red-500 mb-2">
                  Diagram will be removed on save.{' '}
                  <button onClick={() => setRemoveDiagram(false)} className="underline">Undo</button>
                </p>
              )}

              {/* New diagram preview */}
              {editDiagram && (
                <div className="flex items-start gap-3 mb-2">
                  <img
                    src={URL.createObjectURL(editDiagram)}
                    alt="New diagram"
                    className="max-h-40 max-w-xs object-contain rounded border border-indigo-200 bg-white"
                  />
                  <button
                    onClick={() => setEditDiagram(null)}
                    className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              {!removeDiagram && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditDiagram(file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    {problem.has_diagram ? 'Replace diagram' : 'Upload diagram'}
                  </button>
                </>
              )}
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-gray-800">
              <MathMarkdown>{problem.question_text}</MathMarkdown>
            </div>

            {/* Diagram — inline, right-sized */}
            {problem.has_diagram && problem.diagram_url && !imgError && (
              <figure className="mt-4 flex flex-col items-center">
                <img
                  src={problem.diagram_url}
                  alt={problem.diagram_description || 'Diagram'}
                  className="max-w-full max-h-72 object-contain rounded-lg border border-gray-100 bg-gray-50"
                  onError={() => setImgError(true)}
                />
                {problem.diagram_description && (
                  <figcaption className="mt-1.5 text-xs text-gray-500 italic text-center">
                    {problem.diagram_description}
                  </figcaption>
                )}
              </figure>
            )}
          </>
        )}

        {/* Tags */}
        {!editing && problem.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Answer box */}
        {!editing && !gradeResult && (
          <div className="mt-4">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer here... Use plain text or LaTeX math ($...$)"
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={handleGrade}
                disabled={!answer.trim() || grading}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {grading ? 'Grading...' : 'Grade with AI'}
              </button>
              {grading && (
                <span className="text-xs text-gray-400">
                  {hasSolution ? 'Grading your answer...' : 'Generating solution & grading... (first time only)'}
                </span>
              )}
              {hasSolution && !gradeResult && (
                <button
                  onClick={() => setShowSolution(v => !v)}
                  className="text-sm text-indigo-500 hover:text-indigo-700"
                >
                  {showSolution ? 'Hide solution' : 'Show solution'}
                </button>
              )}
            </div>
            {gradeError && (
              <p className="mt-2 text-sm text-red-600">{gradeError}</p>
            )}
          </div>
        )}

        {/* Grade result */}
        {!editing && gradeResult && (
          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-800">
                Score: {earnedMarks}/{marksNum} marks ({gradeResult.score}%)
              </span>
              {gradeResult.solution_generated && (
                <span className="text-xs text-emerald-600 font-medium">✓ Solution generated & saved</span>
              )}
            </div>
            {/* Score bar */}
            <div className="h-2 bg-indigo-200 rounded-full mb-3">
              <div
                className={`h-2 rounded-full transition-all ${gradeResult.score >= 70 ? 'bg-green-500' : gradeResult.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${gradeResult.score}%` }}
              />
            </div>
            <p className="text-sm text-gray-700">{gradeResult.feedback}</p>
            <button
              onClick={() => { setAnswer(''); setGradeResult(null); setGradeError(''); }}
              className="mt-3 text-xs text-indigo-500 hover:text-indigo-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Solution panel */}
      {!editing && (hasSolution || gradeResult?.model_solution) && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowSolution((v) => !v)}
            className="w-full px-5 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors text-left flex items-center gap-2"
          >
            <span>{showSolution ? '▲ Hide solution' : '▼ Show solution'}</span>
            {problem.solution_status === 'verified' && (
              <span className="ml-auto text-xs text-green-600 font-medium">✓ Verified</span>
            )}
          </button>

          {showSolution && (
            <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-emerald-50">
              <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Model Solution</p>
              <div className="prose prose-sm max-w-none text-gray-800">
                <MathMarkdown>{gradeResult?.model_solution || problem.model_solution}</MathMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasSolution && !gradeResult && (
        <div className="border-t border-gray-100 px-5 py-2.5">
          <span className="text-xs text-gray-400 italic">Solution generated on first submission</span>
        </div>
      )}
    </div>
  );
}
