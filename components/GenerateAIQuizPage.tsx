import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { Question, MultipleChoiceQuestion, ShortAnswerQuestion, EssayQuestion, PassageQuestion, ClozeQuestion, AssessmentMode, Course } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SwordsIcon } from './icons/SwordsIcon';
import apiClient from '../services/api';

type QuestionType = 'multiple-choice' | 'essay' | 'short-answer' | 'passage' | 'cloze' | 'true-false';

interface GenerateAIQuizPageProps {
  onQuizCreated: (quiz: any) => void;
  onCancel: () => void;
  courses: Course[];
}

export const GenerateAIQuizPage: React.FC<GenerateAIQuizPageProps> = ({ onQuizCreated, onCancel, courses }) => {
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [contextPdf, setContextPdf] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState<QuestionType>('multiple-choice');
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('quiz');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Linking
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedLessonId, setSelectedLessonId] = useState<number | ''>('');
  const [pdfInfoMessage, setPdfInfoMessage] = useState('');

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
                  points: assessmentMode === 'exam' ? 20 : 10,
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
                  points: assessmentMode === 'exam' ? 10 : 5,
                  case_sensitive: false,
                  exact_match: false,
                  max_length: 100
              } as ShortAnswerQuestion;
          } else if (type === 'cloze') {
              return {
                  id: baseId,
                  type: 'cloze',
                  question_text: normalized.question,
                  points: assessmentMode === 'exam' ? 5 : 2,
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
                  difficulty: assessmentMode === 'exam' ? 'hard' : 'medium',
                  points: (normalized.questions?.length || 5) * 2
              } as PassageQuestion;
          } else {
              const options = normalized.options || [];
              const correctIndex = options.indexOf(normalized.correctAnswer);
              return {
                  id: baseId,
                  type: 'multiple_choice',
                  question_text: normalized.question,
                  options,
                  correct_answer_index: correctIndex >= 0 ? correctIndex : 0,
                  points: assessmentMode === 'exam' ? 5 : 1
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

    try {
      const effectiveNumQuestions = questionType === 'passage' ? Math.ceil(numQuestions / 3) : numQuestions;

      const formData = new FormData();
      formData.append('transcript', sourceText);
      formData.append('num_questions', String(effectiveNumQuestions));
      formData.append('difficulty', assessmentMode === 'exam' ? 'hard' : 'medium');
      if (contextPdf) {
        formData.append('context_pdf', contextPdf);
      }

      // Call backend API instead of Gemini directly
      const response = await apiClient.post('/ai/generate-quiz/', formData);
      
      const result = response.data;
      if (result?.raw_response) {
        setError('AI returned an unexpected format. Please try again or shorten your text.');
        return;
      }
      if (typeof result?.pdf_context_pages_used === 'number') {
        setPdfInfoMessage(`Used ${result.pdf_context_pages_used} PDF page(s) as context.`);
      }
      const questions = Array.isArray(result?.questions) ? result.questions : Array.isArray(result) ? result : [];
      const mappedQuestions = mapToQuestionObjects(questions, questionType);
      if (!mappedQuestions.length) {
        setError('AI did not return any quiz questions. Please try again.');
        return;
      }

      const newQuiz = {
        title: `AI Generated ${topic} Quiz`,
        description: `Assessment generated from provided source material about ${topic}`,
        topic: topic,
        questions: mappedQuestions.length,
        questions_data: mappedQuestions, 
        time: numQuestions * (assessmentMode === 'exam' ? 10 : 2),
        source_type: 'text',
        assessment_type: assessmentMode,
        difficulty: assessmentMode === 'exam' ? 'hard' : 'medium',
        context: selectedCourseId && selectedLessonId ? {
            type: 'course_lesson',
            courseId: Number(selectedCourseId),
            lessonId: Number(selectedLessonId)
        } : undefined
      };
      onQuizCreated(newQuiz);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.error || err?.response?.data?.detail;
      if (detail) {
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

  const selectedCourse = courses.find(c => c.id === Number(selectedCourseId));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Generate AI Assessment</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg shadow-slate-900/5 space-y-6">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
            <SparklesIcon className="w-5 h-5 text-teal-500" />
            <p>Let AI create a custom assessment for you from any text content.</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div 
                onClick={() => setAssessmentMode('quiz')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    assessmentMode === 'quiz' 
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                }`}
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${assessmentMode === 'quiz' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg dark:text-slate-200">Quiz Mode</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Focuses on conceptual understanding, definitions, and basic application. Good for review.
                </p>
            </div>

            <div 
                onClick={() => setAssessmentMode('exam')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    assessmentMode === 'exam' 
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${assessmentMode === 'exam' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <SwordsIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg dark:text-slate-200">Exam Mode</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Rigorous problem solving. Pulls from competitive problem banks (e.g. IMO) where possible.
                </p>
            </div>
        </div>
        
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic</label>
          <input 
            type="text" 
            id="topic" 
            value={topic} 
            onChange={e => setTopic(e.target.value)} 
            required 
            placeholder="e.g., Combinatorics, The French Revolution"
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        
        <div>
          <label htmlFor="sourceText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Context / Level / Source Text
          </label>
          <textarea 
            id="sourceText" 
            value={sourceText} 
            onChange={e => setSourceText(e.target.value)} 
            rows={6} 
            required 
            placeholder={assessmentMode === 'exam' 
                ? "Enter specific level (e.g. 'IMO level', 'Graduate Physics') or paste source material..." 
                : "Paste an article, transcript, or simple notes here..."}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical" />
        </div>

        <div>
          <label htmlFor="contextPdf" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            PDF Context (Optional)
          </label>
          <input
            id="contextPdf"
            type="file"
            accept="application/pdf"
            onChange={(e) => setContextPdf(e.target.files?.[0] || null)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Page limits by tier: Learner 8, Pro 20, Pro+ 40. Upload text-based PDFs for best results.
          </p>
          {contextPdf && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Selected: {contextPdf.name}
            </p>
          )}
          {pdfInfoMessage && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{pdfInfoMessage}</p>
          )}
        </div>

        {/* Linking Section */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 mb-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <BookOpenIcon className="w-4 h-4" />
                Link to Course (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Select Course
                    </label>
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => {
                            setSelectedCourseId(Number(e.target.value));
                            setSelectedLessonId('');
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                        <option value="">-- No Course --</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Select Lesson (Required if Course selected)
                    </label>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Questions</label>
                <input 
                    type="number" 
                    id="numQuestions" 
                    value={numQuestions} 
                    onChange={e => setNumQuestions(Number(e.target.value))} 
                    required min="1" max="20" 
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
                <label htmlFor="questionType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Type</label>
                 <select 
                    id="questionType"
                    value={questionType} 
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="essay">Essay / Proof</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="cloze">Cloze (Fill-in-Blanks)</option>
                    <option value="passage">Passage Based</option>
                </select>
            </div>
        </div>

        {error && <p className="text-red-500 text-sm -my-2">{error}</p>}

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onCancel} disabled={isLoading} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
          <button type="submit" disabled={isLoading} className={`px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-wait ${assessmentMode === 'exam' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                </>
            ) : (
                <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate {assessmentMode === 'exam' ? 'Exam' : 'Quiz'}
                </>
            )}
            </button>
        </div>
      </form>
    </div>
  );
};
