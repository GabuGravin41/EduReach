import apiClient from './api';

export interface VideoInfo {
  video_id: string;
  title: string;
  author?: string;
  duration?: number;
  thumbnail_url?: string;
  has_transcript: boolean;
  available_languages?: Array<{
    language_code: string;
    language_name: string;
    auto_generated: boolean;
  }>;
}

export interface TranscriptData {
  success: boolean;
  video_id: string;
  transcript: string;
  metadata?: {
    title: string;
    author: string;
    duration: number;
    thumbnail_url: string;
  };
  available_languages?: Array<{
    language_code: string;
    language_name: string;
    auto_generated: boolean;
  }>;
  error?: string;
}

export const youtubeService = {
  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  },

  /**
   * Get video info (metadata and transcript availability)
   */
  async getVideoInfo(url: string): Promise<VideoInfo> {
    const response = await apiClient.get('/youtube/video-info/', {
      params: { url }
    });
    return response.data;
  },

  /**
   * Extract transcript from YouTube video
   */
  async extractTranscript(url: string, language: string = 'en'): Promise<TranscriptData> {
    const response = await apiClient.post('/youtube/extract-transcript/', {
      url,
      language
    });
    return response.data;
  },

  /**
   * Fetch transcript for a lesson
   */
  async fetchLessonTranscript(lessonId: number, language: string = 'en', forceRefresh: boolean = false): Promise<any> {
    const response = await apiClient.post(`/lessons/${lessonId}/fetch_transcript/`, {
      language,
      force_refresh: forceRefresh
    });
    return response.data;
  },

  /**
   * Update manual transcript for a lesson
   */
  async updateManualTranscript(lessonId: number, transcript: string): Promise<any> {
    const response = await apiClient.post(`/lessons/${lessonId}/update_manual_transcript/`, {
      manual_transcript: transcript
    });
    return response.data;
  },

  /**
   * Get transcript for a lesson
   */
  async getLessonTranscript(lessonId: number): Promise<any> {
    const response = await apiClient.get(`/lessons/${lessonId}/get_transcript/`);
    return response.data;
  },

  /**
   * Generate quiz from lesson transcript
   */
  async generateQuizFromLesson(lessonId: number, numQuestions: number = 5, difficulty: string = 'medium'): Promise<any> {
    const response = await apiClient.post(`/lessons/${lessonId}/generate_quiz/`, {
      num_questions: numQuestions,
      difficulty
    });
    return response.data;
  },

  /**
   * Save generated quiz as assessment
   */
  async saveQuizAsAssessment(lessonId: number, data: {
    title: string;
    quiz_data: any;
    time_limit_minutes?: number;
    is_public?: boolean;
  }): Promise<any> {
    const response = await apiClient.post(`/lessons/${lessonId}/save_quiz_as_assessment/`, data);
    return response.data;
  }
};
