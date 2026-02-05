export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'passage' | 'cloze';

export interface BaseQuestion {
    id: string;
    type: QuestionType;
    points: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'multiple_choice';
    question_text: string;
    options: string[];
    correct_answer_index: number;
    explanation?: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: 'true_false';
    question_text: string;
    correct_answer: boolean;
    explanation?: string;
}

export interface ShortAnswerQuestion extends BaseQuestion {
    type: 'short_answer';
    question_text: string;
    correct_answers: string[];
    case_sensitive: boolean;
    exact_match: boolean;
    max_length: number;
    explanation?: string;
}

export interface RubricCriterion {
    id: string;
    name: string;
    description: string;
    max_points: number;
}

export interface EssayQuestion extends BaseQuestion {
    type: 'essay';
    question_text: string;
    max_words: number;
    rubric_criteria: RubricCriterion[];
    ai_grading_enabled: boolean;
    sample_answer?: string;
    model_solution?: string; // Hidden source of truth for the AI grader
}

export interface PassageSubQuestion {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'short_answer' | 'true_false';
    options?: string[];
    correct_answer: string | number | boolean;
    points: number;
    explanation?: string;
    passage_reference?: string;
}

export interface PassageQuestion extends BaseQuestion {
    type: 'passage';
    passage_text: string;
    passage_title: string;
    questions: PassageSubQuestion[];
    reading_time_limit?: number;
    word_count: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface ClozeQuestion extends BaseQuestion {
    type: 'cloze';
    question_text: string; // Contains text with [blanks] inside brackets
    explanation?: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion | EssayQuestion | PassageQuestion | ClozeQuestion;

// Core Data Models
export interface Lesson {
    id: number;
    title: string;
    videoId: string;
    isCompleted: boolean;
    duration: string;
    transcript?: string;
    thumbnail?: string;
    notes?: string;
    chatHistory?: ChatMessage[];
}

export interface CourseNote {
    id: string;
    lessonId: string;
    lessonTitle: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
    thumbnail: string;
    isPublic: boolean;
    lessons: Lesson[];
    notes?: CourseNote[];
    level?: string;
    tags?: string[];
}

export type AssessmentMode = 'quiz' | 'exam';

export interface AssessmentContext {
    type: 'standalone' | 'course_lesson' | 'course_final';
    courseId?: number;
    lessonId?: number;
}

export interface Assessment {
    id: number;
    title: string;
    topic: string;
    questions: number;
    time: number; // minutes
    status: string; // 'pending' | 'completed'
    score: string;
    description?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    question_types?: string[];
    created_at?: string;
    // For AI generated ones
    questions_data?: any[]; 
    source_type?: 'text' | 'youtube';
    source_url?: string;
    assessment_type?: AssessmentMode;
    context?: AssessmentContext;
    share_token?: string;
    creator?: { id: number; username?: string };
}
