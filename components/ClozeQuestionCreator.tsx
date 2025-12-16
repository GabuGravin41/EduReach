
import React from 'react';
import { TrashIcon } from './icons/TrashIcon';
import type { ClozeQuestion } from '../types';

interface ClozeQuestionCreatorProps {
    question: ClozeQuestion;
    onQuestionChange: (question: ClozeQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const ClozeQuestionCreator: React.FC<ClozeQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const updateQuestion = (field: keyof ClozeQuestion, value: any) => {
        // Auto-calculate points based on blanks
        if (field === 'question_text') {
            const blanks = (value.match(/\[(.*?)\]/g) || []).length;
            onQuestionChange({
                ...question,
                [field]: value,
                points: Math.max(1, blanks)
            });
        } else {
            onQuestionChange({
                ...question,
                [field]: value
            });
        }
    };

    const renderPreview = () => {
        if (!question.question_text) return <span className="text-slate-400 italic">Preview will appear here...</span>;

        const parts = question.question_text.split(/(\[.*?\])/g);
        return (
            <div className="leading-relaxed">
                {parts.map((part, i) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                        return (
                            <span key={i} className="mx-1 inline-block">
                                <input
                                    type="text"
                                    disabled
                                    placeholder={part.slice(1, -1)}
                                    className="w-24 px-2 py-1 border-b-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-center text-sm font-medium text-indigo-700 dark:text-indigo-300"
                                />
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Fill-in-the-Blanks (Cloze) Question {questionIndex + 1}
                </h3>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 text-sm text-blue-700 dark:text-blue-300">
                <strong>How to use:</strong> Type your sentence below. Wrap words in brackets to turn them into blanks.
                <br />
                Example: <code>The capital of [France] is [Paris].</code>
            </div>

            {/* Question Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Question Text
                </label>
                <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion('question_text', e.target.value)}
                    placeholder="Enter text with [blanks]..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none font-mono text-sm"
                    rows={4}
                />
            </div>

            {/* Preview Area */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Preview (What students see)
                </label>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200">
                    {renderPreview()}
                </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Points (Auto-calculated)
                    </label>
                    <input
                        type="number"
                        value={question.points}
                        disabled
                        className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    />
                </div>
            </div>
        </div>
    );
};
