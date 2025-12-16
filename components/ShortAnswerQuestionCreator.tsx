import React, { useState } from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import type { ShortAnswerQuestion } from '../types';

interface ShortAnswerQuestionCreatorProps {
    question: ShortAnswerQuestion;
    onQuestionChange: (question: ShortAnswerQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const ShortAnswerQuestionCreator: React.FC<ShortAnswerQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const [newAnswer, setNewAnswer] = useState('');

    const updateQuestion = (field: keyof ShortAnswerQuestion, value: any) => {
        onQuestionChange({
            ...question,
            [field]: value
        });
    };

    const addCorrectAnswer = () => {
        if (newAnswer.trim()) {
            updateQuestion('correct_answers', [...question.correct_answers, newAnswer.trim()]);
            setNewAnswer('');
        }
    };

    const removeCorrectAnswer = (index: number) => {
        const updatedAnswers = question.correct_answers.filter((_, i) => i !== index);
        updateQuestion('correct_answers', updatedAnswers);
    };

    const updateCorrectAnswer = (index: number, value: string) => {
        const updatedAnswers = [...question.correct_answers];
        updatedAnswers[index] = value;
        updateQuestion('correct_answers', updatedAnswers);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Short Answer Question {questionIndex + 1}
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
                    Question
                </label>
                <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion('question_text', e.target.value)}
                    placeholder="Enter a question that can be answered with a short phrase or sentence..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={3}
                />
            </div>

            {/* Correct Answers */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Correct Answers
                </label>
                
                {/* Existing Answers */}
                <div className="space-y-2 mb-3">
                    {question.correct_answers.map((answer, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={answer}
                                onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Acceptable answer"
                            />
                            <button
                                onClick={() => removeCorrectAnswer(index)}
                                className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add New Answer */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCorrectAnswer()}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Add another acceptable answer"
                    />
                    <button
                        onClick={addCorrectAnswer}
                        disabled={!newAnswer.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
