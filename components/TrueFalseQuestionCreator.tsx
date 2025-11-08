import React from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface TrueFalseQuestion {
    id: string;
    question_text: string;
    correct_answer: boolean;
    points: number;
    explanation?: string;
}

interface TrueFalseQuestionCreatorProps {
    question: TrueFalseQuestion;
    onQuestionChange: (question: TrueFalseQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const TrueFalseQuestionCreator: React.FC<TrueFalseQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const updateQuestion = (field: keyof TrueFalseQuestion, value: any) => {
        onQuestionChange({
            ...question,
            [field]: value
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    True/False Question {questionIndex + 1}
                </h3>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Question Text */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Statement
                </label>
                <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion('question_text', e.target.value)}
                    placeholder="Enter a clear statement that can be definitively true or false..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={3}
                />
            </div>

            {/* Answer Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Correct Answer
                </label>
                <div className="flex gap-4">
                    <button
                        onClick={() => updateQuestion('correct_answer', true)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                            question.correct_answer === true
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : 'border-slate-300 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-500'
                        }`}
                    >
                        {question.correct_answer === true && <CheckCircleIcon className="w-5 h-5" />}
                        <span className="font-medium">TRUE</span>
                    </button>
                    <button
                        onClick={() => updateQuestion('correct_answer', false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                            question.correct_answer === false
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                : 'border-slate-300 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-500'
                        }`}
                    >
                        {question.correct_answer === false && <CheckCircleIcon className="w-5 h-5" />}
                        <span className="font-medium">FALSE</span>
                    </button>
                </div>
            </div>

            {/* Points */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Points
                </label>
                <input
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    min="1"
                    max="10"
                />
            </div>

            {/* Explanation */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Explanation (Optional)
                </label>
                <textarea
                    value={question.explanation || ''}
                    onChange={(e) => updateQuestion('explanation', e.target.value)}
                    placeholder="Explain why this statement is true or false to help students learn..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={3}
                />
            </div>

            {/* Preview */}
            {question.question_text && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview:</h5>
                    <p className="text-slate-800 dark:text-slate-100 mb-3">{question.question_text}</p>
                    <div className="flex gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                            question.correct_answer === true 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                            True
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                            question.correct_answer === false 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                            False
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {question.points} point{question.points !== 1 ? 's' : ''} • 
                        Correct answer: {question.correct_answer ? 'TRUE' : 'FALSE'}
                    </div>
                </div>
            )}
        </div>
    );
};
