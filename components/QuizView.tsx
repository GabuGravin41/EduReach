import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import apiClient from '../services/api';
import { assessmentService } from '../src/services/assessmentService';
import type { 
    Question, 
    QuizQuestion, 
    MultipleChoiceQuestion, 
    TrueFalseQuestion, 
    ShortAnswerQuestion, 
    EssayQuestion, 
    PassageQuestion, 
    ClozeQuestion 
} from '../types';
import { Button } from './ui/Button';

interface QuizViewProps {
  quiz: QuizQuestion[] | Question[] | null;
  timeLimitMinutes?: number;
  assessmentId?: number;
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz, timeLimitMinutes, assessmentId }) => {
  // Normalize input to standard Question[] format
  const questions: Question[] = useMemo(() => {
    if (!quiz || !Array.isArray(quiz)) return [];
    
    return quiz.map((q: any, idx) => {
        // If it's already a valid Question with a type, return it
        if (q.type && q.id) {
            return q as Question;
        }

        const baseId = `ai-${idx}-${Date.now()}`;
        
        // Handle AI Service Schema mappings
        // Case 1: Essay (has question, maybe no options/correctAnswer)
        if (q.question && !q.options && !q.correctAnswer) {
             return {
                id: baseId,
                type: 'essay',
                points: 10,
                question_text: q.question,
                max_words: 500,
                rubric_criteria: q.rubric_criteria || [],
                model_solution: q.model_solution,
                ai_grading_enabled: true
            } as EssayQuestion;
        }

        // Case 2: Short Answer (has question and correctAnswer, no options)
        if (q.question && q.correctAnswer && (!q.options || q.options.length === 0)) {
            return {
                id: baseId,
                type: 'short_answer',
                points: 5,
                question_text: q.question,
                correct_answers: [q.correctAnswer],
                case_sensitive: false,
                exact_match: false,
                max_length: 100
            } as ShortAnswerQuestion;
        }

        // Case 3: Multiple Choice (default fallback if options exist)
        return {
            id: baseId,
            type: 'multiple_choice',
            question_text: q.question || 'Untitled Question',
            options: q.options || [],
            correct_answer_index: q.options && q.correctAnswer ? q.options.indexOf(q.correctAnswer) : 0,
            points: 1
        } as MultipleChoiceQuestion;
    });
  }, [quiz]);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(
    timeLimitMinutes ? Math.max(0, Math.round(timeLimitMinutes * 60)) : null
  );
  
  // State for individual AI grading of essays
  const [gradingResults, setGradingResults] = useState<Record<string, { score: number, feedback: string }>>({});
  const [isGrading, setIsGrading] = useState<Record<string, boolean>>({});
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});

  const handleAnswerChange = (questionId: string, value: any) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleUploadImage = async (questionId: string, file: File) => {
    if (!assessmentId) return;
    setUploadingImages(prev => ({ ...prev, [questionId]: true }));
    try {
      await assessmentService.uploadAnswerImage(assessmentId, questionId, file);
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionId]: false }));
    }
  };

  useEffect(() => {
    if (!timeLimitMinutes || isSubmitted) return;
    setTimeLeftSeconds(Math.max(0, Math.round(timeLimitMinutes * 60)));
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitMinutes, isSubmitted]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGradeEssay = async (q: EssayQuestion) => {
      const studentAnswer = answers[q.id];
      if (!studentAnswer || !studentAnswer.trim()) return;

      setIsGrading(prev => ({ ...prev, [q.id]: true }));
      
      try {
        const gradePrompt = `You are an expert educator. Grade the following student essay response.

Question: ${q.question_text}

Model Solution/Expected Answer: ${q.model_solution || "No model solution provided."}

Student Answer: ${studentAnswer}

Provide a JSON response with:
- score (0-100)
- feedback (detailed feedback on what was good and what could improve)

Format: {"score": number, "feedback": "string"}`;

        const response = await apiClient.post('/ai/chat/', {
          message: gradePrompt,
          context: q.question_text
        });

        const responseText = response.data.response || response.data;
        
        // Try to parse JSON from response
        let result = { score: 0, feedback: "Could not parse grading response" };
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = { score: 75, feedback: responseText };
          }
        } catch (e) {
          result = { score: 75, feedback: responseText };
        }

        setGradingResults(prev => ({ ...prev, [q.id]: result }));
      } catch (error) {
        console.error('Error grading essay:', error);
        setGradingResults(prev => ({ ...prev, [q.id]: { score: 0, feedback: "Error grading essay. Please try again." } }));
      }
      
      setIsGrading(prev => ({ ...prev, [q.id]: false }));
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
        if (!q.type) return; 

        if (q.type === 'passage') {
            q.questions.forEach(subQ => {
                totalPoints += subQ.points;
                const userAns = answers[`${q.id}-${subQ.id}`];
                if (subQ.question_type === 'multiple_choice' && userAns === subQ.options?.[subQ.correct_answer as number]) {
                    earnedPoints += subQ.points;
                } else if (subQ.correct_answer === userAns) {
                    earnedPoints += subQ.points;
                }
            });
        } else {
            totalPoints += q.points;
            
            if (q.type === 'multiple_choice') {
                if (answers[q.id] === q.options[q.correct_answer_index]) earnedPoints += q.points;
            } else if (q.type === 'true_false') {
                if (answers[q.id] === q.correct_answer) earnedPoints += q.points;
            } else if (q.type === 'short_answer') {
                const userText = (answers[q.id] || '').trim();
                const isCorrect = q.correct_answers.some(ans => 
                    q.case_sensitive ? ans === userText : ans.toLowerCase() === userText.toLowerCase()
                );
                if (isCorrect) earnedPoints += q.points;
            } else if (q.type === 'cloze') {
                // Parse blanks and check
                const parts: string[] = q.question_text?.match(/\[(.*?)\]/g) || [];
                let correctBlanks = 0;
                parts.forEach((part, idx) => {
                    const expected = part.slice(1, -1);
                    const userVal = answers[`${q.id}-${idx}`] || '';
                    if (userVal.toLowerCase().trim() === expected.toLowerCase().trim()) correctBlanks++;
                });
                if (parts.length > 0) {
                    earnedPoints += (correctBlanks / parts.length) * q.points;
                }
            } else if (q.type === 'essay') {
                // Use AI graded score if available, otherwise 0
                if (gradingResults[q.id]) {
                    // Normalize 0-100 score to points
                    earnedPoints += (gradingResults[q.id].score / 100) * q.points;
                }
            }
        }
    });

    return { earned: Math.round(earnedPoints * 10) / 10, total: totalPoints };
  };

  const results = isSubmitted ? calculateScore() : { earned: 0, total: 0 };

  if (questions.length === 0) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">
          No questions available.
        </p>
      </div>
    );
  }

  // --- Renderers for Question Types ---

  const renderCloze = (q: ClozeQuestion) => {
    if (!q.question_text) return null;
    const parts = q.question_text.split(/(\[.*?\])/g);
    let blankIndex = 0;

    return (
        <div className="leading-relaxed text-lg">
            {parts.map((part, i) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    const currentBlankIdx = blankIndex++;
                    const answerKey = `${q.id}-${currentBlankIdx}`;
                    const val = answers[answerKey] || '';
                    const expected = part.slice(1, -1);
                    const isCorrect = isSubmitted && val.toLowerCase().trim() === expected.toLowerCase().trim();

                    return (
                        <span key={i} className="mx-1 inline-block relative">
                            <input
                                type="text"
                                disabled={isSubmitted}
                                value={val}
                                onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                className={`w-32 px-2 py-1 border-b-2 text-center font-medium outline-none transition-colors ${
                                    isSubmitted
                                        ? isCorrect 
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                            : 'border-rose-500 bg-rose-50 text-rose-800'
                                        : 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-200'
                                }`}
                            />
                            {isSubmitted && !isCorrect && (
                                <span className="absolute -top-6 left-0 text-xs text-emerald-600 font-bold bg-white px-1 rounded shadow">
                                    {expected}
                                </span>
                            )}
                        </span>
                    );
                }
                return <span key={i} className="dark:text-slate-200">{part}</span>;
            })}
        </div>
    );
  };

  const renderPassage = (q: PassageQuestion) => {
      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap dark:text-slate-300">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{q.passage_title}</h4>
                  <MarkdownRenderer content={q.passage_text} />
              </div>
              <div className="space-y-6">
                  {q.questions.map((subQ, idx) => (
                      <div key={subQ.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="font-semibold mb-3 dark:text-slate-200">
                              <span className="mr-2">{idx + 1}.</span>
                              <MarkdownRenderer content={subQ.question_text} />
                          </div>
                          {/* Reuse logic for simple sub-questions (only MC supported in sub currently for simplicity) */}
                          <div className="space-y-2">
                              {subQ.options?.map((opt, optIdx) => {
                                  const isSelected = answers[`${q.id}-${subQ.id}`] === opt;
                                  let btnClass = "w-full text-left p-3 rounded-md border border-slate-300 dark:border-slate-600 transition-colors dark:text-slate-300";
                                  
                                  if (isSubmitted) {
                                      if (optIdx === subQ.correct_answer) btnClass += " bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
                                      else if (isSelected) btnClass += " bg-rose-100 border-rose-500 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
                                  } else {
                                      if (isSelected) btnClass += " bg-indigo-100 border-indigo-500 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
                                      else btnClass += " hover:bg-slate-50 dark:hover:bg-slate-700";
                                  }

                                  return (
                                      <button 
                                        key={optIdx} 
                                        className={btnClass}
                                        onClick={() => handleAnswerChange(`${q.id}-${subQ.id}`, opt)}
                                        disabled={isSubmitted}
                                      >
                                          {opt}
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-slate-800">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Assessment</h3>
          <div className="flex items-center gap-4">
            {timeLeftSeconds !== null && !isSubmitted && (
              <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Time left: {formatTime(timeLeftSeconds)}
              </div>
            )}
            {isSubmitted && (
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    Score: {results.earned} / {results.total}
                </div>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can type answers directly (LaTeX supported). If you’re not comfortable typing math, you can upload an image instead.
          Typed answers can be graded instantly; image uploads are stored for manual review.
        </div>
      </div>

      <div className="space-y-8 max-w-4xl mx-auto">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            
            {/* Header */}
            {q.type !== 'passage' && (
                <div className="flex gap-3 mb-4">
                    <span className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {index + 1}
                    </span>
                    <div className="flex-1">
                        {q.type !== 'cloze' && (
                            <div className="text-lg font-medium text-slate-800 dark:text-slate-100">
                                <MarkdownRenderer content={q.type === 'essay' ? (q as EssayQuestion).question_text : (q as any).question_text} />
                            </div>
                        )}
                        <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-1 block">
                            {q.type ? q.type.replace('_', ' ') : 'Question'} • {q.points} pts
                        </span>
                    </div>
                </div>
            )}

            {/* Body */}
            <div>
                {q.type === 'multiple_choice' && (
                    <div className="space-y-2 pl-11">
                        {(q as MultipleChoiceQuestion).options?.map((opt, i) => {
                            const isSelected = answers[q.id] === opt;
                            const isCorrect = (q as MultipleChoiceQuestion).correct_answer_index === i;
                            
                            let className = "w-full text-left p-3 rounded-lg border transition-all ";
                            if (isSubmitted) {
                                if (isCorrect) className += "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300";
                                else if (isSelected) className += "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300";
                                else className += "border-slate-200 dark:border-slate-700 text-slate-500 opacity-50";
                            } else {
                                if (isSelected) className += "bg-indigo-50 border-indigo-500 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 shadow-sm";
                                else className += "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300";
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswerChange(q.id, opt)}
                                    disabled={isSubmitted}
                                    className={className}
                                >
                                    <div className="flex items-center justify-between">
                                        <span><MarkdownRenderer content={opt} /></span>
                                        {isSubmitted && isCorrect && <CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
                                        {isSubmitted && isSelected && !isCorrect && <XIcon className="w-5 h-5 text-rose-600" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {q.type === 'true_false' && (
                    <div className="flex gap-4 pl-11">
                        {[true, false].map((val) => {
                            const isSelected = answers[q.id] === val;
                            const isCorrect = (q as TrueFalseQuestion).correct_answer === val;
                            
                            return (
                                <button
                                    key={String(val)}
                                    onClick={() => handleAnswerChange(q.id, val)}
                                    disabled={isSubmitted}
                                    className={`px-6 py-3 rounded-lg border font-medium transition-all ${
                                        isSubmitted
                                            ? isCorrect ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : isSelected ? 'bg-rose-100 border-rose-500 text-rose-800' : 'opacity-50'
                                            : isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                    }`}
                                >
                                    {val ? 'True' : 'False'}
                                </button>
                            );
                        })}
                    </div>
                )}

                {q.type === 'short_answer' && (
                    <div className="pl-11">
                        <input
                            type="text"
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            disabled={isSubmitted}
                            placeholder="Type your answer..."
                            className="w-full max-w-md p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100"
                        />
                        {isSubmitted && (
                            <div className="mt-2 text-sm text-slate-500">
                                Correct answers: {(q as ShortAnswerQuestion).correct_answers?.join(', ')}
                            </div>
                        )}
                        {assessmentId && (
                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadImage(q.id, file);
                                  e.currentTarget.value = '';
                                }}
                              />
                              <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                Upload image answer
                              </span>
                            </label>
                            {uploadingImages[q.id] && <span>Uploading...</span>}
                          </div>
                        )}
                    </div>
                )}

                {q.type === 'cloze' && (
                    <div className="pl-11">
                        {renderCloze(q as ClozeQuestion)}
                    </div>
                )}

                {q.type === 'passage' && (
                    <div>
                        {renderPassage(q as PassageQuestion)}
                    </div>
                )}

                {q.type === 'essay' && (
                    <div className="pl-11">
                        <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            disabled={isSubmitted && !!gradingResults[q.id]}
                            rows={6}
                            className="w-full p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none font-mono text-sm"
                            placeholder="Write your response here... (Supports LaTeX)"
                        />
                        
                        {/* Preview User Math input if needed - optional enhancement */}
                        
                        {isSubmitted && !gradingResults[q.id] && (
                            <div className="mt-3">
                                <Button 
                                    onClick={() => handleGradeEssay(q as EssayQuestion)}
                                    disabled={isGrading[q.id]}
                                    variant="secondary"
                                    className="gap-2"
                                >
                                    {isGrading[q.id] ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            AI Grading in Progress...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-4 h-4 text-indigo-600" />
                                            Grade with AI
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {gradingResults[q.id] && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-indigo-500" />
                                        AI Feedback
                                    </h5>
                                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-sm">
                                        {gradingResults[q.id].score} / 100
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {gradingResults[q.id].feedback}
                                </div>
                                
                                {(q as EssayQuestion).model_solution && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                        <details>
                                            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-indigo-600 uppercase tracking-wide">
                                                Reveal Model Solution
                                            </summary>
                                            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                                                <MarkdownRenderer content={(q as EssayQuestion).model_solution!} />
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        )}
                        {assessmentId && (
                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadImage(q.id, file);
                                  e.currentTarget.value = '';
                                }}
                              />
                              <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                Upload image answer
                              </span>
                            </label>
                            {uploadingImages[q.id] && <span>Uploading...</span>}
                          </div>
                        )}
                    </div>
                )}
            </div>

            {/* Explanation / Feedback */}
            {isSubmitted && (q as any).explanation && (
                <div className="mt-4 ml-11 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                    <strong>Explanation:</strong> <MarkdownRenderer content={(q as any).explanation} />
                </div>
            )}
          </div>
        ))}
      </div>
      
      {!isSubmitted && (
          <div className="max-w-4xl mx-auto mt-8 flex justify-end">
            <Button 
                onClick={() => setIsSubmitted(true)}
                size="lg"
                className="w-full md:w-auto"
            >
                Submit Assessment
            </Button>
          </div>
      )}
    </div>
  );
};
