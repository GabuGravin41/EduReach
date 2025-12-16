import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import type { EssayQuestion, RubricCriterion } from '../types';

interface EssayQuestionCreatorProps {
    question: EssayQuestion;
    onQuestionChange: (question: EssayQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const EssayQuestionCreator: React.FC<EssayQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const [showRubricBuilder, setShowRubricBuilder] = useState(false);

    const updateQuestion = (field: keyof EssayQuestion, value: any) => {
        onQuestionChange({
            ...question,
            [field]: value
        });
    };

    const addRubricCriterion = () => {
        const newCriterion: RubricCriterion = {
            id: Date.now().toString(),
            name: '',
            description: '',
            max_points: 5
        };
        updateQuestion('rubric_criteria', [...question.rubric_criteria, newCriterion]);
    };

    const updateRubricCriterion = (criterionId: string, field: keyof RubricCriterion, value: any) => {
        const updatedCriteria = question.rubric_criteria.map(criterion =>
            criterion.id === criterionId ? { ...criterion, [field]: value } : criterion
        );
        updateQuestion('rubric_criteria', updatedCriteria);
    };

    const removeRubricCriterion = (criterionId: string) => {
        const updatedCriteria = question.rubric_criteria.filter(criterion => criterion.id !== criterionId);
        updateQuestion('rubric_criteria', updatedCriteria);
    };

    const generateAISampleAnswer = async () => {
        const sampleAnswer = `This is an AI-generated sample answer for: "${question.question_text}". 

The response demonstrates key concepts and provides a structured approach to answering the question. Students should aim to include relevant examples, clear explanations, and logical reasoning in their responses.

Key points to address:
1. Main concept explanation
2. Supporting evidence or examples  
3. Analysis and critical thinking
4. Clear conclusion or summary

This sample can help guide both students and instructors in understanding the expected depth and quality of responses.`;
        
        updateQuestion('sample_answer', sampleAnswer);
    };

    const totalPoints = question.rubric_criteria.reduce((sum, criterion) => sum + criterion.max_points, 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Essay Question {questionIndex + 1}
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
                    Essay Question
                </label>
                <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion('question_text', e.target.value)}
                    placeholder="Enter your essay question here. Be specific about what you want students to analyze, discuss, or explain..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={4}
                />
            </div>

            {/* Question Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Maximum Words
                    </label>
                    <input
                        type="number"
                        value={question.max_words}
                        onChange={(e) => updateQuestion('max_words', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        min="50"
                        max="2000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Base Points
                    </label>
                    <input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        min="1"
                        max="100"
                    />
                </div>
                <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={question.ai_grading_enabled}
                            onChange={(e) => updateQuestion('ai_grading_enabled', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Enable AI Grading
                        </span>
                    </label>
                </div>
            </div>

            {/* Rubric Builder */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100">
                        Grading Rubric {totalPoints > 0 && `(${totalPoints} points total)`}
                    </h4>
                    <button
                        onClick={() => setShowRubricBuilder(!showRubricBuilder)}
                        className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        {showRubricBuilder ? 'Hide Rubric' : 'Build Rubric'}
                    </button>
                </div>

                {showRubricBuilder && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        {question.rubric_criteria.map((criterion) => (
                            <div key={criterion.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-3 border border-slate-200 dark:border-slate-600">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Criterion name (e.g., Content Quality)"
                                            value={criterion.name}
                                            onChange={(e) => updateRubricCriterion(criterion.id, 'name', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max points"
                                            value={criterion.max_points}
                                            onChange={(e) => updateRubricCriterion(criterion.id, 'max_points', parseInt(e.target.value) || 0)}
                                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                            min="1"
                                            max="20"
                                        />
                                        <button
                                            onClick={() => removeRubricCriterion(criterion.id)}
                                            className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Describe what constitutes different performance levels for this criterion..."
                                    value={criterion.description}
                                    onChange={(e) => updateRubricCriterion(criterion.id, 'description', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                                    rows={2}
                                />
                            </div>
                        ))}
                        
                        <button
                            onClick={addRubricCriterion}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            Add Rubric Criterion
                        </button>
                    </div>
                )}
            </div>

            {/* AI Sample Answer */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100">
                        Sample Answer (Optional)
                    </h4>
                    <button
                        onClick={generateAISampleAnswer}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Generate with AI
                    </button>
                </div>
                <textarea
                    value={question.sample_answer || ''}
                    onChange={(e) => updateQuestion('sample_answer', e.target.value)}
                    placeholder="Provide a sample answer to help guide grading and give students an example of expected quality..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={6}
                />
            </div>
        </div>
    );
};
