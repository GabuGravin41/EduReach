import React, { useState, useMemo, useEffect } from 'react';
import type { QuizQuestion } from '../types';
import { Button } from './ui/Button';
import { EmptyState } from './EmptyState';

interface QuizViewProps {
  quiz: QuizQuestion[] | null;
  onUpdateQuiz?: (quiz: QuizQuestion[]) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz, onUpdateQuiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableQuiz, setEditableQuiz] = useState<QuizQuestion[]>(quiz ?? []);

  useEffect(() => {
    setEditableQuiz(quiz ?? []);
  }, [quiz]);

  const effectiveQuiz = isEditing ? editableQuiz : (quiz ?? []);

  const score = useMemo(() => {
    if (!isSubmitted || !quiz) return 0;
    return quiz.reduce((acc, question, index) => {
      return selectedAnswers[index] === question.correctAnswer ? acc + 1 : acc;
    }, 0);
  }, [isSubmitted, quiz, selectedAnswers]);

  const handleSelectAnswer = (questionIndex: number, answer: string) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  if (!quiz || quiz.length === 0) {
    return (
      <EmptyState
        title="No quiz yet"
        description="Ask the assistant to generate a quiz to test your knowledge."
        className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800"
      />
    );
  }

  const handleQuestionChange = (index: number, value: string) => {
    setEditableQuiz(prev => {
      const next = [...prev];
      next[index] = { ...next[index], question: value };
      return next;
    });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    setEditableQuiz(prev => {
      const next = [...prev];
      const options = next[questionIndex].options ? [...next[questionIndex].options] : [];
      options[optionIndex] = value;
      next[questionIndex] = { ...next[questionIndex], options };
      return next;
    });
  };

  const handleCorrectAnswerChange = (questionIndex: number, value: string) => {
    setEditableQuiz(prev => {
      const next = [...prev];
      next[questionIndex] = { ...next[questionIndex], correctAnswer: value };
      return next;
    });
  };

  const handleSaveEdits = () => {
    onUpdateQuiz?.(editableQuiz);
    setIsEditing(false);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Test Your Knowledge</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(prev => !prev)}>
            {isEditing ? 'Cancel edit' : 'Edit questions'}
          </Button>
          {isEditing && (
            <Button size="sm" onClick={handleSaveEdits}>
              Save changes
            </Button>
          )}
        </div>
      </div>
      
      {isSubmitted && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 text-center">
            <p className="text-xl font-bold text-indigo-800 dark:text-indigo-200">
              Your Score: {score} / {quiz.length}
            </p>
        </div>
      )}

      <div className="space-y-6">
        {effectiveQuiz.map((q, index) => (
          <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            {isEditing ? (
              <textarea
                value={editableQuiz[index]?.question ?? ''}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2 mb-3"
              />
            ) : (
              <p className="font-semibold mb-3 text-slate-700 dark:text-slate-200">{index + 1}. {q.question}</p>
            )}
            <div className="space-y-2">
              {q.options.map((option, optIndex) => {
                if (isEditing) {
                  return (
                    <input
                      key={optIndex}
                      value={editableQuiz[index]?.options?.[optIndex] ?? ''}
                      onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2"
                    />
                  );
                }

                const isSelected = selectedAnswers[index] === option;
                let optionClass = "w-full text-left p-3 rounded-md transition-colors border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
                
                if (isSubmitted) {
                    if (option === q.correctAnswer) {
                        optionClass += " bg-teal-100 dark:bg-teal-800/60 border-teal-400 font-semibold";
                    } else if (isSelected && option !== q.correctAnswer) {
                        optionClass += " bg-rose-100 dark:bg-rose-800/60 border-rose-400";
                    }
                } else {
                    optionClass += isSelected 
                        ? " bg-blue-200 dark:bg-blue-800/60 border-blue-400" 
                        : " hover:bg-slate-100 dark:hover:bg-slate-600/60";
                }

                return (
                  <button
                    key={optIndex}
                    onClick={() => handleSelectAnswer(index, option)}
                    disabled={isSubmitted}
                    className={optionClass}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {isEditing && (
              <div className="mt-3">
                <label className="text-xs uppercase text-slate-500 dark:text-slate-400">Correct answer</label>
                <input
                  value={editableQuiz[index]?.correctAnswer ?? ''}
                  onChange={(e) => handleCorrectAnswerChange(index, e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!isSubmitted && !isEditing && (
          <Button 
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length !== quiz.length}
            className="w-full mt-6 justify-center"
          >
            Submit Answers
          </Button>
      )}
    </div>
  );
};