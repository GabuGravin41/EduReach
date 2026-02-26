import React from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import type { MultipleChoiceQuestion } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MultipleChoiceQuestionCreatorProps {
    question: MultipleChoiceQuestion;
    onQuestionChange: (question: MultipleChoiceQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const MultipleChoiceQuestionCreator: React.FC<MultipleChoiceQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const updateQuestion = (field: keyof MultipleChoiceQuestion, value: any) => {
        onQuestionChange({
            ...question,
            [field]: value
        });
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        updateQuestion('options', newOptions);
    };

    const addOption = () => {
        if (question.options.length < 6) {
            updateQuestion('options', [...question.options, '']);
        }
    };

    const removeOption = (index: number) => {
        if (question.options.length > 2) {
            const newOptions = question.options.filter((_, i) => i !== index);
            updateQuestion('options', newOptions);

            // Adjust correct_answer_index if needed
            if (question.correct_answer_index === index) {
                updateQuestion('correct_answer_index', 0);
            } else if (question.correct_answer_index > index) {
                updateQuestion('correct_answer_index', question.correct_answer_index - 1);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Multiple Choice Question {questionIndex + 1}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Question <span className="text-xs text-slate-500">(Supports LaTeX: $...$)</span>
                </label>
                <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion('question_text', e.target.value)}
                    placeholder="Enter your question. Use LaTeX for math."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none font-medium"
                    rows={3}
                />
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Answer Options
                </label>
                {question.options.map((option, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => updateQuestion('correct_answer_index', index)}
                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${question.correct_answer_index === index
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {question.correct_answer_index === index ? (
                                    <CheckCircleIcon className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                                )}
                            </button>
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                            {question.options.length > 2 && (
                                <button
                                    onClick={() => removeOption(index)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {option.trim() && (
                            <div className="ml-9 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                                <MarkdownRenderer content={option} />
                            </div>
                        )}
                    </div>
                ))}

                {question.options.length < 6 && (
                    <button
                        onClick={addOption}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 ml-9"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        Add Option
                    </button>
                )}
            </div>

            {/* Points */}
            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Points
                    </label>
                    <input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        min="1"
                    />
                </div>
            </div>
        </div>
    );
};
