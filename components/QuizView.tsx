import React, { useState, useMemo } from 'react';
import type { QuizQuestion } from '../types';

interface QuizViewProps {
  quiz: QuizQuestion[] | null;
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

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

  if (!quiz) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">
          No quiz has been generated yet. Ask the AI Assistant to create one!
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-slate-800">
      <h3 className="text-2xl font-bold mb-4 text-center text-slate-800 dark:text-slate-100">Test Your Knowledge</h3>
      
      {isSubmitted && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 text-center">
            <p className="text-xl font-bold text-indigo-800 dark:text-indigo-200">
              Your Score: {score} / {quiz.length}
            </p>
        </div>
      )}

      <div className="space-y-6">
        {quiz.map((q, index) => (
          <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <p className="font-semibold mb-3 text-slate-700 dark:text-slate-200">{index + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((option, optIndex) => {
                const isSelected = selectedAnswers[index] === option;
                let optionClass = "w-full text-left p-3 rounded-md transition-colors border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
                
                if (isSubmitted) {
                    if (option === q.correctAnswer) {
                        optionClass += " bg-teal-100 dark:bg-teal-800/60 border-teal-400 font-semibold";
                    } else if (isSelected && option !== q.correctAnswer) {
                        optionClass += " bg-red-100 dark:bg-red-800/60 border-red-400";
                    }
                } else {
                    optionClass += isSelected 
                        ? " bg-indigo-200 dark:bg-indigo-800/60 border-indigo-400" 
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
          </div>
        ))}
      </div>
      
      {!isSubmitted && (
          <button 
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length !== quiz.length}
            className="w-full mt-6 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
      )}
    </div>
  );
};