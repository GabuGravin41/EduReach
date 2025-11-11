import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PencilIcon as DocumentTextIcon } from './icons/PencilIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserTier } from '../App';
import { EssayQuestionCreator } from './EssayQuestionCreator';
import { TrueFalseQuestionCreator } from './TrueFalseQuestionCreator';
import { ShortAnswerQuestionCreator } from './ShortAnswerQuestionCreator';
import { PassageQuestionCreator } from './PassageQuestionCreator';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'passage';

interface BaseQuestion {
    id: string;
    type: QuestionType;
    points: number;
}

interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'multiple_choice';
    question_text: string;
    options: string[];
    correct_answer_index: number;
    explanation?: string;
}

interface TrueFalseQuestion extends BaseQuestion {
    type: 'true_false';
    question_text: string;
    correct_answer: boolean;
    explanation?: string;
}

interface ShortAnswerQuestion extends BaseQuestion {
    type: 'short_answer';
    question_text: string;
    correct_answers: string[];
    case_sensitive: boolean;
    exact_match: boolean;
    max_length: number;
    explanation?: string;
}

interface EssayQuestion extends BaseQuestion {
    type: 'essay';
    question_text: string;
    max_words: number;
    rubric_criteria: Array<{
        id: string;
        name: string;
        description: string;
        max_points: number;
    }>;
    ai_grading_enabled: boolean;
    sample_answer?: string;
}

interface PassageQuestion extends BaseQuestion {
    type: 'passage';
    passage_text: string;
    passage_title: string;
    questions: Array<{
        id: string;
        question_text: string;
        question_type: 'multiple_choice' | 'short_answer' | 'true_false';
        options?: string[];
        correct_answer: string | number | boolean;
        points: number;
        explanation?: string;
        passage_reference?: string;
    }>;
    reading_time_limit?: number;
    word_count: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion | EssayQuestion | PassageQuestion;

interface EnhancedCreateExamPageProps {
    onExamCreated: (exam: any) => void;
    onCancel: () => void;
    userTier: UserTier;
}

const TIER_FEATURES = {
    free: { can_create_essay: false, can_create_passage: false, can_create_advanced: false, max_questions: 10 },
    learner: { can_create_essay: true, can_create_passage: false, can_create_advanced: false, max_questions: 50 },
    pro: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: 'unlimited' },
    pro_plus: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: 'unlimited' },
    admin: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: 'unlimited' }
};

export const EnhancedCreateExamPage: React.FC<EnhancedCreateExamPageProps> = ({
    onExamCreated,
    onCancel,
    userTier
}) => {
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple_choice');

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

        // Validate all questions have content
        const invalidQuestions = questions.filter(q => !q.question_text?.trim());
        if (invalidQuestions.length > 0) {
            alert('Please complete all questions before saving');
            return;
        }

        const examData = {
            title: title.trim(),
            topic: topic.trim(),
            description: description.trim(),
            time_limit_minutes: timeLimit,
            questions: questions
        };

        onExamCreated(examData);
    };

    const totalPoints = questions.reduce((sum, q) => {
        if (q.type === 'essay') {
            const rubricPoints = q.rubric_criteria.reduce((rubricSum, criterion) => rubricSum + criterion.max_points, 0);
            return sum + q.points + rubricPoints;
        }
        return sum + q.points;
    }, 0);

    const renderQuestionCreator = (question: Question, index: number) => {
        switch (question.type) {
            case 'multiple_choice':
                // For now, show a placeholder for multiple choice (existing component can be integrated)
                return (
                    <div key={question.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                            Multiple Choice Question {index + 1}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Multiple choice question creator - integrate existing CreateExamPage component
                        </p>
                    </div>
                );

            case 'true_false':
                return (
                    <TrueFalseQuestionCreator
                        key={question.id}
                        question={question as TrueFalseQuestion}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'short_answer':
                return (
                    <ShortAnswerQuestionCreator
                        key={question.id}
                        question={question as ShortAnswerQuestion}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'essay':
                return (
                    <EssayQuestionCreator
                        key={question.id}
                        question={question as EssayQuestion}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
                );

            case 'passage':
                return (
                    <PassageQuestionCreator
                        key={question.id}
                        question={question as PassageQuestion}
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
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button
                        onClick={() => addQuestion('multiple_choice')}
                        className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group"
                    >
                        <ClipboardCheckIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm">Multiple Choice</h3>
                    </button>

                    <button
                        onClick={() => addQuestion('true_false')}
                        className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-green-300 dark:hover:border-green-500 transition-colors group"
                    >
                        <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm">True/False</h3>
                    </button>

                    <button
                        onClick={() => addQuestion('short_answer')}
                        className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors group"
                    >
                        <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm">Short Answer</h3>
                    </button>

                    <button
                        onClick={() => addQuestion('essay')}
                        disabled={!features.can_create_essay}
                        className={`p-4 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group ${
                            features.can_create_essay
                                ? 'hover:border-purple-300 dark:hover:border-purple-500'
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <DocumentTextIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                            Essay {!features.can_create_essay && '(Learner+)'}
                        </h3>
                    </button>

                    <button
                        onClick={() => addQuestion('passage')}
                        disabled={!features.can_create_passage}
                        className={`p-4 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group ${
                            features.can_create_passage
                                ? 'hover:border-orange-300 dark:hover:border-orange-500'
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                        <DocumentTextIcon className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                            Reading Passage {!features.can_create_passage && '(Pro+)'}
                        </h3>
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
