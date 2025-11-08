import React, { useState } from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface PassageQuestion {
    id: string;
    passage_text: string;
    passage_title: string;
    questions: PassageSubQuestion[];
    reading_time_limit?: number; // in minutes
    word_count: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface PassageSubQuestion {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'short_answer' | 'true_false';
    options?: string[]; // for multiple choice
    correct_answer: string | number | boolean;
    points: number;
    explanation?: string;
    passage_reference?: string; // specific text from passage this question refers to
}

interface PassageQuestionCreatorProps {
    question: PassageQuestion;
    onQuestionChange: (question: PassageQuestion) => void;
    onRemove: () => void;
    questionIndex: number;
}

export const PassageQuestionCreator: React.FC<PassageQuestionCreatorProps> = ({
    question,
    onQuestionChange,
    onRemove,
    questionIndex
}) => {
    const [selectedText, setSelectedText] = useState('');
    const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);

    const updateQuestion = (field: keyof PassageQuestion, value: any) => {
        const updatedQuestion = { ...question, [field]: value };
        
        // Auto-calculate word count when passage text changes
        if (field === 'passage_text') {
            updatedQuestion.word_count = value.trim().split(/\s+/).length;
        }
        
        onQuestionChange(updatedQuestion);
    };

    const addSubQuestion = () => {
        const newSubQuestion: PassageSubQuestion = {
            id: Date.now().toString(),
            question_text: '',
            question_type: 'multiple_choice',
            options: ['', '', '', ''],
            correct_answer: 0,
            points: 1
        };
        
        updateQuestion('questions', [...question.questions, newSubQuestion]);
        setShowQuestionBuilder(true);
    };

    const updateSubQuestion = (subQuestionId: string, field: keyof PassageSubQuestion, value: any) => {
        const updatedQuestions = question.questions.map(q =>
            q.id === subQuestionId ? { ...q, [field]: value } : q
        );
        updateQuestion('questions', updatedQuestions);
    };

    const removeSubQuestion = (subQuestionId: string) => {
        const updatedQuestions = question.questions.filter(q => q.id !== subQuestionId);
        updateQuestion('questions', updatedQuestions);
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    };

    const getEstimatedReadingTime = () => {
        // Average reading speed: 200-250 words per minute
        return Math.ceil(question.word_count / 225);
    };

    const getTotalPoints = () => {
        return question.questions.reduce((sum, q) => sum + q.points, 0);
    };

    const renderSubQuestionEditor = (subQuestion: PassageSubQuestion, index: number) => {
        return (
            <div key={subQuestion.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-600">
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-slate-800 dark:text-slate-100">
                        Question {index + 1}
                    </h4>
                    <button
                        onClick={() => removeSubQuestion(subQuestion.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Question Type Selector */}
                <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Question Type
                    </label>
                    <select
                        value={subQuestion.question_type}
                        onChange={(e) => updateSubQuestion(subQuestion.id, 'question_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="true_false">True/False</option>
                    </select>
                </div>

                {/* Question Text */}
                <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Question
                    </label>
                    <textarea
                        value={subQuestion.question_text}
                        onChange={(e) => updateSubQuestion(subQuestion.id, 'question_text', e.target.value)}
                        placeholder="Enter your question about the passage..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                        rows={2}
                    />
                </div>

                {/* Options for Multiple Choice */}
                {subQuestion.question_type === 'multiple_choice' && (
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Answer Options
                        </label>
                        {subQuestion.options?.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2 mb-2">
                                <input
                                    type="radio"
                                    name={`correct-${subQuestion.id}`}
                                    checked={subQuestion.correct_answer === optionIndex}
                                    onChange={() => updateSubQuestion(subQuestion.id, 'correct_answer', optionIndex)}
                                    className="w-4 h-4 text-indigo-600"
                                />
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                        const newOptions = [...(subQuestion.options || [])];
                                        newOptions[optionIndex] = e.target.value;
                                        updateSubQuestion(subQuestion.id, 'options', newOptions);
                                    }}
                                    placeholder={`Option ${optionIndex + 1}`}
                                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* True/False Options */}
                {subQuestion.question_type === 'true_false' && (
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Correct Answer
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name={`tf-${subQuestion.id}`}
                                    checked={subQuestion.correct_answer === true}
                                    onChange={() => updateSubQuestion(subQuestion.id, 'correct_answer', true)}
                                    className="w-4 h-4 text-indigo-600 mr-2"
                                />
                                True
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name={`tf-${subQuestion.id}`}
                                    checked={subQuestion.correct_answer === false}
                                    onChange={() => updateSubQuestion(subQuestion.id, 'correct_answer', false)}
                                    className="w-4 h-4 text-indigo-600 mr-2"
                                />
                                False
                            </label>
                        </div>
                    </div>
                )}

                {/* Short Answer */}
                {subQuestion.question_type === 'short_answer' && (
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Correct Answer
                        </label>
                        <input
                            type="text"
                            value={subQuestion.correct_answer as string}
                            onChange={(e) => updateSubQuestion(subQuestion.id, 'correct_answer', e.target.value)}
                            placeholder="Enter the correct answer"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                )}

                {/* Points and Reference */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Points
                        </label>
                        <input
                            type="number"
                            value={subQuestion.points}
                            onChange={(e) => updateSubQuestion(subQuestion.id, 'points', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            min="1"
                            max="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Reference Text
                        </label>
                        <input
                            type="text"
                            value={subQuestion.passage_reference || selectedText}
                            onChange={(e) => updateSubQuestion(subQuestion.id, 'passage_reference', e.target.value)}
                            placeholder="Specific passage text this refers to"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Reading Comprehension {questionIndex + 1}
                    </h3>
                </div>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Passage Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Passage Title
                    </label>
                    <input
                        type="text"
                        value={question.passage_title}
                        onChange={(e) => updateQuestion('passage_title', e.target.value)}
                        placeholder="Enter passage title"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Difficulty Level
                    </label>
                    <select
                        value={question.difficulty}
                        onChange={(e) => updateQuestion('difficulty', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
            </div>

            {/* Passage Text */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reading Passage
                </label>
                <textarea
                    value={question.passage_text}
                    onChange={(e) => updateQuestion('passage_text', e.target.value)}
                    onMouseUp={handleTextSelection}
                    placeholder="Paste or type the reading passage here. Students will read this text and answer questions based on it..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                    rows={8}
                />
                <div className="flex justify-between items-center mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{question.word_count} words • ~{getEstimatedReadingTime()} min read</span>
                    {selectedText && (
                        <span className="text-indigo-600 dark:text-indigo-400">
                            Selected: "{selectedText.substring(0, 30)}..."
                        </span>
                    )}
                </div>
            </div>

            {/* Questions Section */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100">
                        Comprehension Questions ({question.questions.length}) • {getTotalPoints()} points total
                    </h4>
                    <button
                        onClick={addSubQuestion}
                        className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        Add Question
                    </button>
                </div>

                {question.questions.map((subQuestion, index) => 
                    renderSubQuestionEditor(subQuestion, index)
                )}

                {question.questions.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                        <BookOpenIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600 dark:text-slate-400">No questions added yet</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">Add questions based on the reading passage</p>
                    </div>
                )}
            </div>

            {/* Reading Time Settings */}
            <div className="mb-4">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={!!question.reading_time_limit}
                        onChange={(e) => updateQuestion('reading_time_limit', e.target.checked ? getEstimatedReadingTime() + 2 : undefined)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Set reading time limit
                    </span>
                </label>
                {question.reading_time_limit && (
                    <div className="mt-2 ml-6">
                        <input
                            type="number"
                            value={question.reading_time_limit}
                            onChange={(e) => updateQuestion('reading_time_limit', parseInt(e.target.value) || undefined)}
                            className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            min="1"
                            max="60"
                        />
                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">minutes</span>
                    </div>
                )}
            </div>

            {/* Preview */}
            {question.passage_text && question.questions.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview:</h5>
                    <div className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">{question.passage_title}</p>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                            {question.passage_text.substring(0, 150)}...
                        </p>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {question.questions.length} question{question.questions.length !== 1 ? 's' : ''} • 
                            {getTotalPoints()} points • 
                            {question.difficulty} difficulty
                            {question.reading_time_limit && ` • ${question.reading_time_limit} min limit`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
