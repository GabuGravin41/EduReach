import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';
import { QuizQuestion } from '../types';

export interface GenerateQuizRequest {
  transcript: string;
  num_questions?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ChatRequest {
  message: string;
  context?: string;
}

export interface StudyPlanRequest {
  topic: string;
  duration_weeks?: number;
  skill_level?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string;
}

export interface ExplainConceptRequest {
  concept: string;
  detail_level?: 'simple' | 'detailed' | 'technical';
}

export const aiService = {
  async generateQuiz(request: GenerateQuizRequest): Promise<QuizQuestion[]> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AI_GENERATE_QUIZ, request);

      // Transform backend response to match frontend QuizQuestion interface
      const questions = response.data.questions || [];
      return questions.map((q: any) => ({
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correct_answer || q.correctAnswer,
        explanation: q.explanation || 'No explanation provided'
      }));
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new Error('Failed to generate quiz');
    }
  },

  async chat(request: ChatRequest): Promise<string> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, request);
      return response.data.response;
    } catch (error) {
      console.error('Error in AI chat:', error);
      throw new Error('Failed to get AI response');
    }
  },

  async generateStudyPlan(request: StudyPlanRequest): Promise<string> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AI_STUDY_PLAN, request);
      return response.data.study_plan;
    } catch (error) {
      console.error('Error generating study plan:', error);
      throw new Error('Failed to generate study plan');
    }
  },

  async explainConcept(request: ExplainConceptRequest): Promise<string> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AI_EXPLAIN, request);
      return response.data.explanation;
    } catch (error) {
      console.error('Error explaining concept:', error);
      throw new Error('Failed to explain concept');
    }
  },
};
