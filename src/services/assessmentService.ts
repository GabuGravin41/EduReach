import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  topic: string;
  questions: AssessmentQuestion[];
  time_limit?: number; // in minutes
  status: 'pending' | 'in_progress' | 'completed';
  score?: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: number;
    username: string;
  };
}

export interface ManualGradePayload {
  attempt_id: number;
  score: string;
  percentage: number;
}

export interface AssessmentQuestion {
  id: number;
  question: string;
  question_type: 'mcq' | 'essay' | 'short_answer';
  options?: string[]; // for MCQ
  correct_answer?: string;
  explanation?: string;
  order: number;
}

export interface CreateAssessmentData {
  title: string;
  description?: string;
  topic: string;
  questions: Omit<AssessmentQuestion, 'id' | 'order'>[];
  time_limit?: number;
}

export interface AssessmentAttempt {
  id: number;
  assessment: Assessment;
  started_at: string;
  completed_at?: string;
  answers: Record<number, string>; // question_id -> answer
  score?: number;
  max_score: number;
}

export const assessmentService = {
  async getAssessments(): Promise<Assessment[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENTS);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }
  },

  async getAttempts(assessmentId: number, shareToken?: string): Promise<AssessmentAttempt[]> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}attempts/`,
        { params: shareToken ? { share_token: shareToken } : undefined }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching attempts:', error);
      throw error;
    }
  },

  async manualGrade(assessmentId: number, payload: ManualGradePayload, shareToken?: string) {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}manual-grade/`,
        payload,
        { params: shareToken ? { share_token: shareToken } : undefined }
      );
      return response.data;
    } catch (error) {
      console.error('Error saving manual grade:', error);
      throw error;
    }
  },

  async exportAttempts(assessmentId: number, shareToken?: string) {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}export-attempts/`,
        {
          params: shareToken ? { share_token: shareToken } : undefined,
          responseType: 'blob',
        }
      );
      return response.data as Blob;
    } catch (error) {
      console.error('Error exporting attempts:', error);
      throw error;
    }
  },

  async exportAttemptsPDF(assessmentId: number, shareToken?: string) {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}export-attempts-pdf/`,
        {
          params: shareToken ? { share_token: shareToken } : undefined,
          responseType: 'blob',
        }
      );
      return response.data as Blob;
    } catch (error) {
      console.error('Error exporting attempts PDF:', error);
      throw error;
    }
  },

  async joinChallenge(assessmentId: number) {
    try {
      const response = await apiClient.post(`${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}join-challenge/`);
      return response.data;
    } catch (error) {
      console.error('Error joining challenge:', error);
      throw error;
    }
  },

  async getMyAssessments(): Promise<Assessment[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MY_ASSESSMENTS);
      return response.data;
    } catch (error) {
      console.error('Error fetching my assessments:', error);
      throw error;
    }
  },

  async getAssessment(id: number): Promise<Assessment> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT_DETAIL(id));
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment:', error);
      throw error;
    }
  },

  async createAssessment(data: CreateAssessmentData): Promise<Assessment> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENTS, data);
      return response.data;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  },

  async updateAssessment(id: number, data: Partial<CreateAssessmentData>): Promise<Assessment> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ASSESSMENT_DETAIL(id), data);
      return response.data;
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  },

  async deleteAssessment(id: number): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ASSESSMENT_DETAIL(id));
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  },

  async startAssessment(assessmentId: number): Promise<AssessmentAttempt> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.START_ASSESSMENT(assessmentId));
      return response.data;
    } catch (error) {
      console.error('Error starting assessment:', error);
      throw error;
    }
  },

  async submitAssessment(assessmentId: number, answers: Record<number, string>): Promise<AssessmentAttempt> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SUBMIT_ASSESSMENT(assessmentId), { answers });
      return response.data;
    } catch (error) {
      console.error('Error submitting assessment:', error);
      throw error;
    }
  },

  async uploadAnswerImage(assessmentId: number, questionId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('question_id', questionId);
      formData.append('image', file);

      const response = await apiClient.post(
        `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}upload-answer-image/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading answer image:', error);
      throw error;
    }
  },

  async getAssessmentQuestions(assessmentId: number): Promise<AssessmentQuestion[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT_QUESTIONS(assessmentId));
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment questions:', error);
      throw error;
    }
  },
};
