import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../src/contexts/ToastContext';
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
import { AIImportModal } from './AIImportModal';
import { assessmentService } from '../src/services/assessmentService';
import type {
    Question,
    QuestionType,
    MultipleChoiceQuestion,
    TrueFalseQuestion,
    ShortAnswerQuestion,
    EssayQuestion,
    PassageQuestion,
    ClozeQuestion,
    Course,
    AssessmentMode,
} from '../types';

interface CreateExamPageProps {
    onExamCreated: (exam: any) => void;
    onExamUpdated?: (assessment: any) => void;
    onCancel: () => void;
    userTier: UserTier;
    courses: Course[];
}

const TIER_FEATURES = {
    free: { can_create_essay: false, can_create_passage: false, can_create_advanced: false, max_questions: 10 },
    learner: { can_create_essay: true, can_create_passage: false, can_create_advanced: false, max_questions: 50 },
    pro: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity },
    pro_plus: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity },
    admin: { can_create_essay: true, can_create_passage: true, can_create_advanced: true, max_questions: Infinity }
};

function apiQuestionToUi(q: any, index: number): Question {
    const id = String(q.id ?? `edit-${index}-${Date.now()}`);
    const t = q.question_type || q.type || 'short_answer';
    const pts = q.points ?? 1;
    const text = q.question_text ?? '';
    const explanation = q.explanation ?? '';
    if (t === 'mcq' || t === 'multiple_choice') {
        const options = Array.isArray(q.options) ? q.options : [];
        const correct = q.correct_answer ?? options[0];
        const idx = options.indexOf(correct);
        return { id, type: 'multiple_choice', question_text: text, options, correct_answer_index: idx >= 0 ? idx : 0, points: pts } as MultipleChoiceQuestion;
    }
    if (t === 'true_false' || t === 'truefalse') {
        const correct = String(q.correct_answer ?? 'true').toLowerCase() === 'true';
        return { id, type: 'true_false', question_text: text, correct_answer: correct, points: pts } as TrueFalseQuestion;
    }
    if (t === 'essay') {
        return { id, type: 'essay', question_text: text, points: pts, max_words: 500, rubric_criteria: [], ai_grading_enabled: true, explanation } as EssayQuestion;
    }
    if (t === 'short_answer') {
        const correct = q.correct_answer ?? '';
        return { id, type: 'short_answer', question_text: text, correct_answers: [correct], case_sensitive: false, exact_match: false, max_length: 100, points: pts, explanation } as ShortAnswerQuestion;
    }
    return { id, type: 'short_answer', question_text: text, correct_answers: [String(q.correct_answer ?? '')], case_sensitive: false, exact_match: false, max_length: 100, points: pts, explanation } as ShortAnswerQuestion;
}

export const CreateExamPage: React.FC<CreateExamPageProps> = ({
    onExamCreated,
    onExamUpdated,
    onCancel,
    userTier,
    courses
}) => {
    const location = useLocation();
    const toast = useToast();
    const editExamId = (location.state as { editExamId?: number } | null)?.editExamId;

    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [imageGraceMinutes, setImageGraceMinutes] = useState(0);
    const [assessmentType, setAssessmentType] = useState<AssessmentMode>('exam');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAIImport, setShowAIImport] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [resultsVisibility, setResultsVisibility] = useState<'private' | 'opt_in_public' | 'public'>('opt_in_public');
    const [editLoading, setEditLoading] = useState(!!editExamId);
    const [editError, setEditError] = useState<string | null>(null);

    useEffect(() => {
        if (!editExamId) return;
        let cancelled = false;
        setEditLoading(true);
        setEditError(null);
        assessmentService.getAssessment(editExamId)
            .then((data: any) => {
                if (cancelled) return;
                setTitle(data.title ?? '');
                setTopic(data.topic ?? '');
                setDescription(data.description ?? '');
                setTimeLimit(Number(data.time_limit_minutes ?? data.time_limit ?? 30));
                setImageGraceMinutes(Number(data.image_upload_grace_minutes ?? 0));
                setAssessmentType((data.assessment_type as AssessmentMode) || 'exam');
                setIsPublic(data.is_public !== false);
                setResultsVisibility((data.results_visibility as any) ?? 'opt_in_public');
                const qs = Array.isArray(data.questions) ? data.questions : [];
                setQuestions(qs.map((q: any, i: number) => apiQuestionToUi(q, i)));
            })
            .catch((err) => { if (!cancelled) { setEditError('Failed to load assessment'); console.error(err); } })
            .finally(() => { if (!cancelled) setEditLoading(false); });
        return () => { cancelled = true; };
    }, [editExamId]);

    // Linking State
    const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
    const [selectedLessonId, setSelectedLessonId] = useState<number | ''>('')

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
            toast.error(`You can only create ${features.max_questions} questions with your current plan.`);
            return;
        }

        const newQuestion = createNewQuestion(type);
        setQuestions([...questions, newQuestion]);
    };

    const handleAIImport = (imported: Question[], suggestedTime?: number, detectedTopic?: string) => {
        // Check limits
        const available = typeof features.max_questions === 'number'
            ? Math.max(0, features.max_questions - questions.length)
            : imported.length;
        const toAdd = imported.slice(0, available);
        if (toAdd.length < imported.length) {
            toast.info(`Plan limit: only ${toAdd.length} of ${imported.length} questions were added. Upgrade to add more.`);
        }
        setQuestions(prev => [...prev, ...toAdd]);
        // Pre-fill topic and time if not already set
        if (detectedTopic && !topic) setTopic(detectedTopic);
        if (suggestedTime && timeLimit === 30) setTimeLimit(suggestedTime);
        setShowAIImport(false);
    };

    const updateQuestion = (questionId: string, updatedQuestion: Question) => {
        setQuestions(questions.map(q => q.id === questionId ? updatedQuestion : q));
    };

    const removeQuestion = (questionId: string) => {
        setQuestions(questions.filter(q => q.id !== questionId));
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Please enter an exam title');
            return;
        }

        if (questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        const invalidQuestions = questions.filter(q => {
            if (q.type === 'passage') return false;
            return !('question_text' in q && q.question_text?.trim());
        });

        if (invalidQuestions.length > 0) {
            toast.error('Please complete all questions before saving');
            return;
        }

        const payload = {
            title: title.trim(),
            topic: topic.trim() || 'General',
            description: description.trim(),
            time_limit_minutes: timeLimit,
            image_upload_grace_minutes: imageGraceMinutes || 0,
            assessment_type: assessmentType,
            questions_data: questions,
            is_public: isPublic,
            results_visibility: resultsVisibility,
            source_lesson: selectedLessonId ? Number(selectedLessonId) : undefined,
        };

        if (editExamId && onExamUpdated) {
            try {
                const updated = await assessmentService.updateAssessment(editExamId, payload as any);
                onExamUpdated(updated);
            } catch (err) {
                console.error(err);
                toast.error('Failed to save changes. You may not have permission to edit this assessment.');
            }
            return;
        }

        const examData = {
            ...payload,
            time: timeLimit,
            questions: questions.length,
            question_types: [...new Set(questions.map(q => q.type))],
            context: selectedCourseId && selectedLessonId ? {
                type: 'course_lesson',
                courseId: Number(selectedCourseId),
                lessonId: Number(selectedLessonId)
            } : undefined
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
                                onChange={(e) => updateQuestion(question.id, { ...question, question_text: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {question.options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        type="radio"
                                        name={`correct_${question.id}`}
                                        checked={question.correct_answer_index === idx}
                                        onChange={() => updateQuestion(question.id, { ...question, correct_answer_index: idx })}
                                    />
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOptions = [...question.options];
                                            newOptions[idx] = e.target.value;
                                            updateQuestion(question.id, { ...question, options: newOptions });
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

    const selectedCourse = courses.find(c => c.id === Number(selectedCourseId));

    if (editLoading) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Loading assessment…</p>
            </div>
        );
    }
    if (editError) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <p className="text-rose-600 dark:text-rose-400 mb-4">{editError}</p>
                <button onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">Back to Assessments</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {editExamId ? 'Edit Assessment' : 'Create New Assessment'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {editExamId ? 'Change title, questions, and settings. You can add, remove, or change question types.' : 'Build a comprehensive assessment with multiple question types'}
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

                {/* Linking Section */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4" />
                        Link to Course (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Select Course
                            </label>
                            <select
                                value={selectedCourseId}
                                onChange={(e) => {
                                    setSelectedCourseId(Number(e.target.value));
                                    setSelectedLessonId(''); // Reset lesson when course changes
                                }}
                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            >
                                <option value="">-- No Course --</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Select Lesson (Required if Course selected)
                            </label>
                            <select
                                value={selectedLessonId}
                                onChange={(e) => setSelectedLessonId(Number(e.target.value))}
                                disabled={!selectedCourseId}
                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                            >
                                <option value="">-- Select Lesson --</option>
                                {selectedCourse?.lessons.map(lesson => (
                                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                                ))}
                            </select>
                        </div>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Assessment Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAssessmentType('quiz')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                                    assessmentType === 'quiz'
                                        ? 'bg-teal-600 text-white border-teal-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                                }`}
                            >
                                Quiz
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssessmentType('exam')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                                    assessmentType === 'exam'
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                                }`}
                            >
                                Exam
                            </button>
                        </div>
                    </div>
                </div>

                {/* Visibility Settings */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Assessment Visibility
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsPublic(true)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${isPublic
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                                    }`}
                            >
                                🌍 Public
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPublic(false)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${!isPublic
                                        ? 'bg-slate-700 text-white border-slate-700'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                                    }`}
                            >
                                🔒 Private
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                            {isPublic ? 'Visible to all users' : 'Only you can see this assessment'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Results Visibility
                        </label>
                        <select
                            value={resultsVisibility}
                            onChange={(e) => setResultsVisibility(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                            <option value="private">🔒 Instructor only</option>
                            <option value="opt_in_public">👤 Students choose (default)</option>
                            <option value="public">🌍 Always public</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-400">Controls who can see student scores</p>
                    </div>
                </div>
            </div>

            {/* AI Import Modal */}
            {showAIImport && (
                <AIImportModal
                    onImport={handleAIImport}
                    onClose={() => setShowAIImport(false)}
                />
            )}

            {/* Add Question Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                        Add Questions
                    </h2>
                    <button
                        onClick={() => setShowAIImport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Import with AI
                    </button>
                </div>

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
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${features.can_create_advanced
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
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${features.can_create_essay
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
                        className={`p-3 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors group flex flex-col items-center ${features.can_create_passage
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
                        {editExamId ? 'Save changes' : 'Create Assessment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
