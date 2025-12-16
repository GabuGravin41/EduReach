
import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PencilIcon as DocumentTextIcon } from './icons/PencilIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserTier } from '../App';
import { EssayQuestionCreator } from './EssayQuestionCreator';
import { TrueFalseQuestionCreator } from './TrueFalseQuestionCreator';
import { ShortAnswerQuestionCreator } from './ShortAnswerQuestionCreator';
import { PassageQuestionCreator } from './PassageQuestionCreator';
import { ClozeQuestionCreator } from './ClozeQuestionCreator';
import type { 
    Question, 
    QuestionType, 
    MultipleChoiceQuestion, 
    TrueFalseQuestion, 
    ShortAnswerQuestion, 
    EssayQuestion, 
    PassageQuestion,
    ClozeQuestion
} from '../types';

interface CreateExamPageProps {
    onExamCreated: (exam: any) => void;
    onCancel: () => void;
    userTier: UserTier;
}

const TIER_FEATURES = {
    free: { can_create_essay: false, can_create_passage: false, can_create_advanced: false, max_questions: 10 },
    learner: { can_create_essay: true, can_create_passage: false, can_create_advanced: false, max_questions: 50 },
    pro: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity },
    pro_plus: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity },
    admin: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity }
};

export const CreateExamPage: React.FC<CreateExamPageProps> = ({
    onExamCreated,
    onCancel,
    userTier
}) => {
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [questions, setQuestions] = useState<Question[]>([]);

    const features = TIER_FEATURES[userTier];

    const createNewQuestion = (type: QuestionType): Question => {
        const baseId = Date.now().toString();
        const baseQuestion = { id: baseId, type, points: 1 };

        switch (type) {
            case 'multiple_choice':
                return {
                    ...baseQuestion,
                    type: 'multiple_choice',
                    question_text: '',
                    options: ['', '', '', ''],
                    correct_answer_index: 0
                } as MultipleChoiceQuestion;

            case 'true_false':
                return {
                    ...baseQuestion,
                    type: 'true_false',
                    question_text: '',
                    correct_answer: true
                } as TrueFalseQuestion;

            case 'short_answer':
                return {
                    ...baseQuestion,
                    type: 'short_answer',
                    question_text: '',
                    correct_answers: [''],
                    case_sensitive: false,
                    exact_match: false,
                    max_length: 100
                } as ShortAnswerQuestion;

            case 'essay':
                return {
                    ...baseQuestion,
                    type: 'essay',
                    question_text: '',
                    max_words: 500,
                    points: 10,
                    rubric_criteria: [],
                    ai_grading_enabled: true
                } as EssayQuestion;

            case 'passage':
                return {
                    ...baseQuestion,
                    type: 'passage',
                    passage_text: '',
                    passage_title: '',
                    questions: [],
                    word_count: 0,
                    difficulty: 'medium',
                    points: 5
                } as PassageQuestion;
            
            case 'cloze':
                return {
                    ...baseQuestion,
                    type: 'cloze',
                    question_text: 'The capital of [France] is [Paris].',
                    points: 2
                } as ClozeQuestion;

            default:
                throw new Error(`Unknown question type: ${type}`);
        }
    };

    const addQuestion = (type: QuestionType) => {
        if (typeof features.max_questions === 'number' && questions.length >= features.max_questions) {
            alert(`You can only create ${features.max_questions} questions with your current plan.`);
            return;
        }

        const newQuestion = createNewQuestion(type);
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (questionId: string, updatedQuestion: Question) => {
        setQuestions(questions.map(q => q.id === questionId ? updatedQuestion : q));
    };

    const removeQuestion = (questionId: string) => {
        setQuestions(questions.filter(q => q.id !== questionId));
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            alert('Please enter an exam title');
            return;
        }

        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        const invalidQuestions = questions.filter(q => {
            if (q.type === 'passage') return false;
            return !('question_text' in q && q.question_text?.trim());
        });

        if (invalidQuestions.length > 0) {
            alert('Please complete all questions before saving');
            return;
        }

        const examData = {
            title: title.trim(),
            topic: topic.trim(),
            description: description.trim(),
            time: timeLimit,
            questions: questions.length,
            questions_data: questions,
            question_types: [...new Set(questions.map(q => q.type))],
        };

        onExamCreated(examData);
    };

    const totalPoints = questions.reduce((sum, q) => {
        if (q.type === 'essay') {
            const rubricPoints = q.rubric_criteria.reduce((rubricSum, criterion) => rubricSum + criterion.max_points, 0);
            return sum + q.points + rubricPoints;
        }
        if (q.type === 'passage') {
             return sum + q.questions.reduce((pSum, pq) => pSum + pq.points, 0);
        }
        return sum + q.points;
    }, 0);

    const renderQuestionCreator = (question: Question, index: number) => {
        switch (question.type) {
            case 'multiple_choice':
                return (
                    <div key={question.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                            Multiple Choice Question {index + 1}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1 dark:text-slate-300">Question</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                                value={question.question_text}
                                onChange={(e) => updateQuestion(question.id, {...question, question_text: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {question.options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input 
                                        type="radio" 
                                        name={`correct_${question.id}`} 
                                        checked={question.correct_answer_index === idx}
                                        onChange={() => updateQuestion(question.id, {...question, correct_answer_index: idx})}
                                    />
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOptions = [...question.options];
                                            newOptions[idx] = e.target.value;
                                            updateQuestion(question.id, {...question, options: newOptions});
                                        }}
                                        placeholder={`Option ${idx + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => removeQuestion(question.id)} className="text-red-500 text-sm hover:underline">Remove</button>
                        </div>
                    </div>
                );

            case 'true_false':
                return (
                    <TrueFalseQuestionCreator
                        key={question.id}
                        question={question}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'short_answer':
                return (
                    <ShortAnswerQuestionCreator
                        key={question.id}
                        question={question}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'essay':
                return (
                    <EssayQuestionCreator
                        key={question.id}
                        question={question}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'passage':
                return (
                    <PassageQuestionCreator
                        key={question.id}
                        question={question}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );
            
            case 'cloze':
                return (
                    <ClozeQuestionCreator
                        key={question.id}
                        question={question}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Create New Assessment
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Build a comprehensive assessment with multiple question types
                </p>
            </div>

            {/* Exam Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    Assessment Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter assessment title"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Topic
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Subject or topic area"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this assessment covers"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Time Limit (minutes)
                        </label>
                        <input
                            type="number"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            min="5"
                            max="300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Questions
                        </label>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium">
                            {questions.length} / {features.max_questions === Infinity ? '∞' : features.max_questions}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Total Points
                        </label>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium">
                            {totalPoints} points
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Question Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    Add Questions
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <button
                        onClick={() => addQuestion('multiple_choice')}
                        className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group flex flex-col items-center"
                    >
                        <ClipboardCheckIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Multi Choice</span>
                    </button>

                    <button
                        onClick={() => addQuestion('true_false')}
                        className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-green-300 dark:hover:border-green-500 transition-colors group flex flex-col items-center"
                    >
                        <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">True/False</span>
                    </button>

                    <button
                        onClick={() => addQuestion('short_answer')}
                        className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors group flex flex-col items-center"
                    >
                        <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Short Answer</span>
                    </button>

                    <button
                        onClick={() => addQuestion('cloze')}
                        disabled={!features.can_create_advanced}
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${
                            features.can_create_advanced
                                ? 'hover:border-teal-300 dark:hover:border-teal-500'
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <SparklesIcon className="w-6 h-6 text-teal-600 dark:text-teal-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Fill Blanks {!features.can_create_advanced && '(Pro)'}
                        </span>
                    </button>

                    <button
                        onClick={() => addQuestion('essay')}
                        disabled={!features.can_create_essay}
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${
                            features.can_create_essay
                                ? 'hover:border-purple-300 dark:hover:border-purple-500'
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Essay {!features.can_create_essay && '(Learner+)'}
                        </span>
                    </button>

                    <button
                        onClick={() => addQuestion('passage')}
                        disabled={!features.can_create_passage}
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${
                            features.can_create_passage
                                ? 'hover:border-orange-300 dark:hover:border-orange-500'
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <BookOpenIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            Passage {!features.can_create_passage && '(Pro+)'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Questions */}
            <div className="mb-8">
                {questions.map((question, index) => renderQuestionCreator(question, index))}
                
                {questions.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                        <ClipboardCheckIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            No questions added yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-500">
                            Click one of the question type buttons above to get started
                        </p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    Cancel
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || questions.length === 0}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        Create Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};
