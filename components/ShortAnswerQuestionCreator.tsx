import React, { useState } from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface ShortAnswerQuestion {
    id: string;
    question_text: string;
    correct_answers: string[];
    points: number;
    case_sensitive: boolean;
    exact_match: boolean;
    max_length: number;
    explanation?: string;
}

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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Add multiple acceptable answers to account for different phrasings
                </p>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Points
                    </label>
                    <input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        min="1"
                        max="10"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Max Characters
                    </label>
                    <input
                        type="number"
                        value={question.max_length}
                        onChange={(e) => updateQuestion('max_length', parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        min="10"
                        max="500"
                    />
                </div>
            </div>

            {/* Matching Options */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Matching Options
                </label>
                <div className="space-y-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={question.case_sensitive}
                            onChange={(e) => updateQuestion('case_sensitive', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            Case sensitive (e.g., "DNA" ≠ "dna")
                        </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={question.exact_match}
                            onChange={(e) => updateQuestion('exact_match', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            Exact match only (no partial credit for similar answers)
                        </span>
                    </label>
                </div>
            </div>

            {/* Explanation */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Explanation (Optional)
                </label>
                <textarea
                    value={question.explanation || ''}
                    onChange={(e) => updateQuestion('explanation', e.target.value)}
                    placeholder="Provide additional context or explanation for the correct answer..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={3}
                />
            </div>

            {/* Preview */}
            {question.question_text && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview:</h5>
                    <p className="text-slate-800 dark:text-slate-100 mb-3">{question.question_text}</p>
                    <div className="mb-3">
                        <input
                            type="text"
                            placeholder="Student answer input..."
                            disabled
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                            maxLength={question.max_length}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Max {question.max_length} characters
                        </p>
                    </div>
                    {question.correct_answers.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Acceptable answers:
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {question.correct_answers.map((answer, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full"
                                    >
                                        {answer}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        {question.points} point{question.points !== 1 ? 's' : ''} • 
                        {question.case_sensitive ? ' Case sensitive' : ' Case insensitive'} • 
                        {question.exact_match ? ' Exact match' : ' Flexible matching'}
                    </div>
                </div>
            )}
        </div>
    );
};
