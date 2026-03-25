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
import { MultipleChoiceQuestionCreator } from './MultipleChoiceQuestionCreator';

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
    const [assessmentType, setAssessmentType] = useState<'quiz' | 'exam'>('quiz');
    const [gradingMode, setGradingMode] = useState<'ai' | 'manual'>('ai');

    const features = TIER_FEATURES[userTier];

    // Derived: does the current question list have any AI-gradable types?
    const hasAiGradableQuestions = questions.some(q => q.type === 'essay' || q.type === 'short_answer');

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
        const invalidQuestions = questions.filter(q => {
            if (q.type === 'passage') return !q.passage_text?.trim();
            return !(q as any).question_text?.trim();
        });
        if (invalidQuestions.length > 0) {
            alert('Please complete all questions before saving');
            return;
        }

        const examData = {
            title: title.trim(),
            topic: topic.trim(),
            description: description.trim(),
            time_limit_minutes: timeLimit,
            assessment_type: assessmentType,
            grading_mode: gradingMode,
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
                return (
                    <MultipleChoiceQuestionCreator
                        key={question.id}
                        question={question as MultipleChoiceQuestion}
                        onQuestionChange={(updated) => updateQuestion(question.id, updated)}
                        onRemove={() => removeQuestion(question.id)}
                        questionIndex={index}
                    />
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
                    Create New {assessmentType === 'quiz' ? 'Quiz' : 'Exam'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {assessmentType === 'quiz'
                        ? 'Build a quick, practice-focused quiz with multiple question types'
                        : 'Build a formal, timed exam with comprehensive question coverage'}
                </p>
            </div>

            {/* ── STEP 1: QUIZ vs EXAM prominent selector ──────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Step 1: What are you creating?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Choose the type of assessment. This affects defaults and how it appears to students.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* QUIZ option */}
                    <button
                        type="button"
                        onClick={() => setAssessmentType('quiz')}
                        className={`relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all focus:outline-none ${
                            assessmentType === 'quiz'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/15'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
                        }`}
                    >
                        {assessmentType === 'quiz' && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                            QUIZ
                        </span>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">Short practice check</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Shorter, practice-focused. Good for quick knowledge checks, homework, or informal self-study.</p>
                        <ul className="mt-3 space-y-1">
                            {['Typically 5–15 questions', 'Lower stakes, for practice', 'Usually unproctored', 'Can be retaken freely'].map(item => (
                                <li key={item} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </button>

                    {/* EXAM option */}
                    <button
                        type="button"
                        onClick={() => { setAssessmentType('exam'); if (timeLimit < 30) setTimeLimit(60); }}
                        className={`relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all focus:outline-none ${
                            assessmentType === 'exam'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-lg shadow-amber-500/15'
                                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-slate-800'
                        }`}
                    >
                        {assessmentType === 'exam' && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                            EXAM
                        </span>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">Formal assessment</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Formal assessment, timed, and scored. For course milestones, certifications, or official grading.</p>
                        <ul className="mt-3 space-y-1">
                            {['Typically 20+ questions', 'Counts toward a grade', 'Timed and structured', 'Essay/written questions supported'].map(item => (
                                <li key={item} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </button>
                </div>
            </div>

            {/* ── STEP 2: Grading Mode ───────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Step 2: How should submissions be graded?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Objective questions (MCQ, True/False) are always auto-graded. This setting applies to written responses.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* AI auto-grade */}
                    <button
                        type="button"
                        onClick={() => setGradingMode('ai')}
                        className={`relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all focus:outline-none ${
                            gradingMode === 'ai'
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/15'
                                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 bg-white dark:bg-slate-800'
                        }`}
                    >
                        {gradingMode === 'ai' && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">AI grades automatically</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">AI evaluates essay and short-answer responses immediately after submission. Students see results in minutes.</p>
                        <p className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400">
                            {features.can_create_essay ? 'Available on your plan' : 'Learner+ plan required for essay grading'}
                        </p>
                    </button>

                    {/* Manual grading */}
                    <button
                        type="button"
                        onClick={() => setGradingMode('manual')}
                        className={`relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all focus:outline-none ${
                            gradingMode === 'manual'
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/15'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800'
                        }`}
                    >
                        {gradingMode === 'manual' && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">I grade manually</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">You review each submission and assign scores yourself. Use this when you want full control over written responses.</p>
                        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Always available — no AI quota used</p>
                    </button>
                </div>
                {/* Note about objective questions */}
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    MCQ and True/False questions are always auto-graded instantly, regardless of this setting.
                </p>
            </div>

            {/* Step 3: Assessment Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Step 3: {assessmentType === 'quiz' ? 'Quiz' : 'Exam'} Details
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Set the title, topic, description, and time limit for your {assessmentType}.
                </p>

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
                            Time Limit
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    Hours
                                </label>
                                <input
                                    type="number"
                                    value={Math.floor(timeLimit / 60)}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const hours = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                                        const minutes = timeLimit % 60;
                                        setTimeLimit(hours * 60 + minutes);
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    min={0}
                                    max={6}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                    Minutes
                                </label>
                                <input
                                    type="number"
                                    value={timeLimit % 60}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        let minutes = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                                        if (minutes > 59) minutes = 59;
                                        const hours = Math.floor(timeLimit / 60);
                                        setTimeLimit(hours * 60 + minutes);
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    min={0}
                                    max={59}
                                />
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Total: {timeLimit} minute{timeLimit === 1 ? '' : 's'}
                        </p>
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

            {/* Step 4: Add Questions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Step 4: Add Questions
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {assessmentType === 'quiz'
                        ? 'Add questions for your quiz. MCQ and True/False work best for quick practice.'
                        : 'Add questions for your exam. Mix objective and written questions for a comprehensive assessment.'}
                </p>
                {/* Grading mode reminder banner */}
                {hasAiGradableQuestions && (
                    <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-sm">
                        <svg className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-violet-800 dark:text-violet-200">
                            You have written questions — these will be{' '}
                            <strong>{gradingMode === 'ai' ? 'graded by AI automatically' : 'graded manually by you'}</strong>.
                            Change in Step 2 if needed.
                        </span>
                    </div>
                )}

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
                        className={`p-4 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group ${features.can_create_essay
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
                        className={`p-4 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group ${features.can_create_passage
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
                <div className="flex items-center gap-3">
                    {/* Summary chip */}
                    {assessmentType === 'exam' ? (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            EXAM
                        </span>
                    ) : (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest border-2 border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            QUIZ
                        </span>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || questions.length === 0}
                        className={`px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold ${
                            assessmentType === 'exam'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        Create {assessmentType === 'quiz' ? 'Quiz' : 'Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
};
