import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { Question, MultipleChoiceQuestion, ShortAnswerQuestion, EssayQuestion, PassageQuestion, ClozeQuestion, AssessmentMode, Course } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import { aiClient } from '../src/services/api';

type QuestionType = 'multiple-choice' | 'essay' | 'short-answer' | 'passage' | 'cloze' | 'true-false';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GenerateAIQuizPageProps {
  onQuizCreated: (quiz: any) => void;
  onCancel: () => void;
  courses: Course[];
}

export const GenerateAIQuizPage: React.FC<GenerateAIQuizPageProps> = ({ onQuizCreated, onCancel, courses }) => {
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [contextPdf, setContextPdf] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState<QuestionType>('multiple-choice');
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('quiz');
  // saveType is the assessment_type sent to the backend when saving
  const [saveType, setSaveType] = useState<'quiz' | 'exam'>('quiz');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [includeEssay, setIncludeEssay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  // Generated preview state
  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Linking
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedLessonId, setSelectedLessonId] = useState<number | ''>('');
  const [pdfInfoMessage, setPdfInfoMessage] = useState('');

  const handleAddTag = () => {
    const trimmed = currentTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const mapToQuestionObjects = (questions: any[], type: string) => {
      if (!Array.isArray(questions)) return [];

      return questions.map((q, idx) => {
          const baseId = `${Date.now()}-${idx}`;
          const normalized = {
              ...q,
              correctAnswer: q.correctAnswer ?? q.correct_answer,
              correct_answer: q.correct_answer ?? q.correctAnswer,
              question: q.question ?? q.question_text,
              options: q.options ?? q.choices ?? [],
          };
          if (type === 'essay') {
              return {
                  id: baseId,
                  type: 'essay',
                  question_text: normalized.question,
                  points: saveType === 'exam' ? 20 : 10,
                  explanation: normalized.explanation,
                  rubric_criteria: normalized.rubric_criteria || [],
                  model_solution: normalized.model_solution,
                  max_words: normalized.max_words || 250,
                  ai_grading_enabled: true
              } as EssayQuestion;
          } else if (type === 'short-answer') {
              return {
                  id: baseId,
                  type: 'short_answer',
                  question_text: normalized.question,
                  correct_answers: [normalized.correctAnswer || ''],
                  points: saveType === 'exam' ? 10 : 5,
                  case_sensitive: false,
                  exact_match: false,
                  max_length: 100
              } as ShortAnswerQuestion;
          } else if (type === 'cloze') {
              return {
                  id: baseId,
                  type: 'cloze',
                  question_text: normalized.question,
                  points: saveType === 'exam' ? 5 : 2,
                  explanation: normalized.explanation
              } as ClozeQuestion;
          } else if (type === 'passage') {
              return {
                  id: baseId,
                  type: 'passage',
                  passage_title: normalized.passage_title || 'Reading Passage',
                  passage_text: normalized.passage_text,
                  word_count: normalized.passage_text?.split(/\s+/).length || 0,
                  questions: (normalized.questions || []).map((subQ: any, subIdx: number) => ({
                      id: `${baseId}-sub-${subIdx}`,
                      question_text: subQ.question_text ?? subQ.question,
                      question_type: 'multiple_choice',
                      options: subQ.options ?? subQ.choices ?? [],
                      correct_answer: subQ.correct_answer ?? subQ.correctAnswer,
                      points: 2
                  })),
                  difficulty: saveType === 'exam' ? 'hard' : 'medium',
                  points: (normalized.questions?.length || 5) * 2
              } as PassageQuestion;
          } else {
              const options = normalized.options || [];
              let correctIndex = options.indexOf(normalized.correctAnswer);
              if (correctIndex < 0 && normalized.correctAnswer) {
                  const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                  correctIndex = letterMap[normalized.correctAnswer.trim()] ?? -1;
              }
              if (correctIndex < 0 && normalized.correctAnswer && options.length > 0) {
                  const lower = String(normalized.correctAnswer).toLowerCase();
                  correctIndex = options.findIndex((o: string) => o.toLowerCase() === lower);
              }
              return {
                  id: baseId,
                  type: 'multiple_choice',
                  question_text: normalized.question,
                  options,
                  correct_answer_index: correctIndex >= 0 ? correctIndex : 0,
                  points: saveType === 'exam' ? 5 : 1
              } as MultipleChoiceQuestion;
          }
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim() || (!sourceText.trim() && !contextPdf)) {
      setError('Please provide a topic and either source text or a PDF context file.');
      return;
    }
    setError('');
    setIsLoading(true);
    setPdfInfoMessage('');
    setGeneratedQuestions(null);
    setShowPreview(false);

    try {
      const effectiveNumQuestions = questionType === 'passage' ? Math.ceil(numQuestions / 3) : numQuestions;
      const trimmedSourceText = sourceText.length > 12000 ? sourceText.slice(0, 12000) : sourceText;

      const formData = new FormData();
      formData.append('transcript', trimmedSourceText);
      formData.append('num_questions', String(effectiveNumQuestions));
      formData.append('difficulty', difficulty);
      if (includeEssay) {
        formData.append('include_essay', 'true');
      }
      if (contextPdf) {
        formData.append('context_pdf', contextPdf);
      }

      const response = await aiClient.post('/ai/generate-quiz/', formData);

      const result = response.data;
      if (result?.raw_response) {
        setError('AI returned an unexpected format. Please try again or shorten your text.');
        return;
      }
      if (typeof result?.pdf_context_pages_used === 'number') {
        setPdfInfoMessage(`Used ${result.pdf_context_pages_used} PDF page(s) as context.`);
      }
      if (sourceText.length > 12000) {
        setPdfInfoMessage((prev) =>
          prev
            ? `${prev} Source text was trimmed to 12,000 characters for faster generation.`
            : 'Source text was trimmed to 12,000 characters for faster generation.'
        );
      }
      const questions = Array.isArray(result?.questions) ? result.questions : Array.isArray(result) ? result : [];
      const mappedQuestions = mapToQuestionObjects(questions, questionType);
      if (!mappedQuestions.length) {
        setError('AI did not return any quiz questions. Please try again.');
        return;
      }

      // Show preview — user confirms save type before committing
      setGeneratedQuestions(mappedQuestions);
      setShowPreview(true);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      if (err?.code === 'ECONNABORTED') {
        setError('AI request timed out. Please try with shorter source text or retry in a moment.');
      } else if (detail) {
        setError(detail);
      } else if (status === 500 || status === 502 || status === 503) {
        setError('AI temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to generate assessment. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedQuestions) return;

    const autoTags = new Set(tags);
    autoTags.add('ai-generated');
    autoTags.add(saveType);
    const finalTags = Array.from(autoTags);

    const newQuiz = {
      title: topic,
      description: `${saveType === 'exam' ? 'Exam' : 'Quiz'} about ${topic}`,
      topic: topic,
      tags: finalTags,
      questions: generatedQuestions.length,
      questions_data: generatedQuestions,
      time: numQuestions * (saveType === 'exam' ? 10 : 2),
      source_type: 'text',
      assessment_type: saveType,
      difficulty: difficulty,
      context: selectedCourseId && selectedLessonId ? {
        type: 'course_lesson',
        courseId: Number(selectedCourseId),
        lessonId: Number(selectedLessonId)
      } : undefined
    };
    onQuizCreated(newQuiz);
  };

  const selectedCourse = courses.find(c => c.id === Number(selectedCourseId));

  const difficultyColors: Record<Difficulty, string> = {
    easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    hard: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700',
  };

  // --- Preview panel ---
  if (showPreview && generatedQuestions) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Preview Generated Questions</h1>
          <button
            onClick={() => { setShowPreview(false); setGeneratedQuestions(null); }}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Back to form
          </button>
        </div>

        {/* Save-as toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Save as</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setSaveType('quiz')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                saveType === 'quiz'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
              }`}
            >
              <BookOpenIcon className="w-4 h-4" />
              QUIZ
            </button>
            <button
              onClick={() => setSaveType('exam')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                saveType === 'exam'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
              }`}
            >
              <SwordsIcon className="w-4 h-4" />
              EXAM
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {saveType === 'quiz'
              ? 'Will be saved as a Quiz — lighter format, suitable for review and practice.'
              : 'Will be saved as an Exam — rigorous format with higher point values, suitable for formal assessment.'}
          </p>
        </div>

        {/* Questions preview */}
        <div className="space-y-4">
          {generatedQuestions.map((q, i) => (
            <div key={q.id || i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex-none w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-black">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${
                      q.type === 'essay' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                      : q.type === 'short_answer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                    }`}>
                      {(q.type || 'mcq').replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">{q.question_text}</p>
                  {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                    <ul className="mt-2 space-y-1">
                      {q.options.map((opt: string, oi: number) => (
                        <li
                          key={oi}
                          className={`text-xs px-3 py-1.5 rounded-lg border ${
                            oi === q.correct_answer_index
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 font-semibold'
                              : 'border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                          {oi === q.correct_answer_index && <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type === 'essay' && q.model_solution && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                      Model solution: {q.model_solution}
                    </p>
                  )}
                  {(q.type === 'short_answer') && Array.isArray(q.correct_answers) && (
                    <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Answer: {q.correct_answers.join(' / ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setShowPreview(false); setGeneratedQuestions(null); }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
          >
            Regenerate
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 shadow transition-all ${
              saveType === 'exam'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90'
            }`}
          >
            Save as {saveType === 'exam' ? 'Exam' : 'Quiz'}
            <span className="text-xs opacity-75">({generatedQuestions.length} questions)</span>
          </button>
        </div>
      </div>
    );
  }

  // --- Main generation form ---
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-slate-800 dark:text-white">Generate AI Assessment</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
        <SparklesIcon className="w-4 h-4 text-teal-500 flex-shrink-0" />
        Let AI create a custom assessment from any text content.
      </p>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-7">

        {/* ── Assessment Type Toggle ──────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Assessment Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setAssessmentMode('quiz'); setSaveType('quiz'); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                saveType === 'quiz'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div className={`p-2 rounded-lg ${saveType === 'quiz' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  <BookOpenIcon className="w-5 h-5" />
                </div>
                <span className={`font-extrabold text-base ${saveType === 'quiz' ? 'text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`}>
                  QUIZ
                </span>
                {saveType === 'quiz' && (
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">Selected</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Light format — conceptual, quick review, lower points per question.
              </p>
            </button>

            <button
              type="button"
              onClick={() => { setAssessmentMode('exam'); setSaveType('exam'); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                saveType === 'exam'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
              }`}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div className={`p-2 rounded-lg ${saveType === 'exam' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  <SwordsIcon className="w-5 h-5" />
                </div>
                <span className={`font-extrabold text-base ${saveType === 'exam' ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'}`}>
                  EXAM
                </span>
                {saveType === 'exam' && (
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">Selected</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rigorous format — higher point values, harder difficulty, formal assessment.
              </p>
            </button>
          </div>
        </div>

        {/* ── Quiz Settings ─────────────────────────────────────────────── */}
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
          <h2 className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Quiz Settings</h2>

          {/* Number of questions — slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Number of Questions
              </label>
              <span className={`text-sm font-black px-3 py-0.5 rounded-lg ${
                saveType === 'exam'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
              }`}>
                {numQuestions}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5</span>
              <span>30</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-all ${
                    difficulty === d
                      ? difficultyColors[d]
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Question type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Primary Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="short-answer">Short Answer</option>
              <option value="essay">Essay / Proof</option>
              <option value="cloze">Cloze (Fill-in-Blanks)</option>
              <option value="passage">Passage Based</option>
            </select>
          </div>

          {/* Include essay toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Include essay questions</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mix in open-ended written questions (AI-graded)</p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeEssay(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${includeEssay ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded bg-white transition-transform ${includeEssay ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* ── Topic ─────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic <span className="text-rose-500">*</span></label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            required
            placeholder="e.g., Combinatorics, The French Revolution"
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
          />
        </div>

        {/* ── Tags ──────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tags (Optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder="Add tags (press Enter)"
              className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!currentTag.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Source Text ───────────────────────────────────────────────── */}
        <div>
          <label htmlFor="sourceText" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Context / Source Text <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="sourceText"
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            rows={6}
            placeholder={saveType === 'exam'
              ? "Enter specific level (e.g. 'IMO level', 'Graduate Physics') or paste source material..."
              : "Paste an article, transcript, or simple notes here..."}
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical text-sm dark:text-white"
          />
        </div>

        {/* ── PDF Context ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">PDF Context (Optional)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setContextPdf(e.target.files?.[0] || null)}
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Page limits by tier: Learner 8, Pro 20, Pro+ 40. Upload text-based PDFs for best results.
          </p>
          {contextPdf && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Selected: {contextPdf.name}</p>
          )}
          {pdfInfoMessage && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{pdfInfoMessage}</p>
          )}
        </div>

        {/* ── Link to Course ────────────────────────────────────────────── */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <BookOpenIcon className="w-4 h-4" />
            Link to Course (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => { setSelectedCourseId(Number(e.target.value)); setSelectedLessonId(''); }}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- No Course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Lesson</label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(Number(e.target.value))}
                disabled={!selectedCourseId}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              >
                <option value="">-- Select Lesson --</option>
                {selectedCourse?.lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait transition-all shadow ${
              saveType === 'exam'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Generate {saveType === 'exam' ? 'Exam' : 'Quiz'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
