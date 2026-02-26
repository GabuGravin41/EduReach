import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  topic: string;
  questions?: AssessmentQuestion[];
  question_count?: number;
  time_limit?: number; // in minutes (legacy)
  time_limit_minutes?: number;
  is_public?: boolean;
  results_visibility?: 'private' | 'opt_in_public' | 'public';
  status?: 'pending' | 'in_progress' | 'completed';
  score?: string;
  share_token?: string;
  creator?: { id: number; username?: string };
  created_at: string;
  updated_at: string;
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
  // Optional client-side question representation; not sent directly to the API.
  questions?: Omit<AssessmentQuestion, 'id' | 'order'>[];
  // Legacy client-side time field (minutes). Mapped to time_limit_minutes for the API.
  time_limit?: number;
  // Preferred explicit API-compatible time field (minutes).
  time_limit_minutes?: number;
  questions_data?: any[];
  results_visibility?: 'private' | 'opt_in_public' | 'public';
  is_public?: boolean;
  /** ID of the Lesson this assessment is linked to (source_lesson FK). */
  source_lesson?: number;
}

export interface AssessmentAttempt {
  id: number;
  assessment: number | Assessment;
  user?: { id: number; username?: string };
  user_username?: string;
  status?: string;
  percentage?: number;
  is_public_result?: boolean;
  started_at: string;
  submitted_at?: string;
  answers: Record<number | string, string>; // question_id -> answer
  score?: number | string;
  max_score?: number;
  time_taken_seconds?: number;
  xp_earned?: number;
  answer_images?: Array<{ id: number; question_id: string; image: string; uploaded_at: string }>;
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

  async getPublicResults(assessmentId: number): Promise<AssessmentAttempt[]> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}public-results/`
    );
    return response.data;
  },

  async setResultVisibility(
    assessmentId: number,
    isPublicResult: boolean
  ): Promise<AssessmentAttempt> {
    const response = await apiClient.post(
      `${API_ENDPOINTS.ASSESSMENT_DETAIL(assessmentId)}set-result-visibility/`,
      { is_public_result: isPublicResult }
    );
    return response.data;
  },

  async createAssessment(data: CreateAssessmentData): Promise<Assessment> {
    try {
      // Normalize payload to match backend AssessmentSerializer expectations
      const payload: any = {
        title: data.title,
        topic: data.topic,
        description: data.description ?? '',
        time_limit_minutes:
          typeof data.time_limit_minutes === 'number'
            ? data.time_limit_minutes
            : typeof data.time_limit === 'number'
              ? data.time_limit
              : 30,
        is_public: typeof data.is_public === 'boolean' ? data.is_public : true,
        results_visibility: data.results_visibility ?? 'opt_in_public',
      };

      if (typeof data.source_lesson === 'number') {
        payload.source_lesson = data.source_lesson;
      }

      if (Array.isArray(data.questions_data) && data.questions_data.length > 0) {
        payload.questions_data = data.questions_data;
      }

      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENTS, payload);
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

  async bulkCreateAssessments(assessments: CreateAssessmentData[]): Promise<Assessment[]> {
    try {
      const response = await apiClient.post(`${API_ENDPOINTS.ASSESSMENTS}bulk-create/`, {
        assessments
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk creating assessments:', error);
      throw error;
    }
  },

  async getAssessmentLeaderboard(assessmentId: number): Promise<AssessmentAttempt[]> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ASSESSMENTS}${assessmentId}/leaderboard/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment leaderboard:', error);
      throw error;
    }
  }
};
