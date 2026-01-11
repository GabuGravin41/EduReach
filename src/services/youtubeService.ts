import apiClient from './api';
import transcriptUtils from '../utils/transcript';

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

export interface VideoMetadataResponse {
  title: string;
  description: string;
  thumbnails?: {
    high?: { url: string };
  };
  duration?: number;
  hasTranscript?: boolean;
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
   * Extract transcript (and metadata) from a YouTube video
   */
  async extractTranscript({
    url,
    videoId,
    language = 'en'
  }: {
    url?: string;
    videoId?: string;
    language?: string;
  } = {}): Promise<TranscriptData> {
    const resolvedUrl = url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

    if (!resolvedUrl) {
      return {
        success: false,
        video_id: videoId || '',
        transcript: '',
        error: 'YouTube URL or video ID is required'
      };
    }

    try {
      const { data } = await apiClient.post('/youtube/extract-transcript/', {
        url: resolvedUrl,
        language
      });

      return {
        success: Boolean(data?.success),
        video_id: data?.video_id || videoId || '',
        transcript: data?.transcript?.transcript || '',
        metadata: data?.metadata,
        available_languages: data?.available_languages,
        error: data?.success ? undefined : data?.error
      };
    } catch (error: any) {
      console.error('Transcript extraction failed:', error);
      // Surface backend error details when available (422 or 400)
      const serverError = error?.response?.data;
      const message = serverError?.error || serverError?.detail || error.message || 'Failed to extract transcript';
      return {
        success: false,
        video_id: videoId || '',
        transcript: '',
        error: message,
        _server: serverError,
      };
    }
  },

  async getVideoMetadata({
    url,
    videoId
  }: {
    url?: string;
    videoId?: string;
  } = {}): Promise<VideoMetadataResponse | null> {
    const resolvedUrl = url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

    if (!resolvedUrl) {
      console.error('YouTube URL or video ID is required to fetch metadata');
      return null;
    }

    try {
      const { data } = await apiClient.get('/youtube/video-info/', {
        params: { url: resolvedUrl }
      });

      const metadata = data?.metadata || {};

      return {
        title: metadata.title || 'Untitled video',
        description: metadata.description || '',
        thumbnails: metadata.thumbnail_url
          ? { high: { url: metadata.thumbnail_url } }
          : undefined,
        duration: metadata.duration,
        hasTranscript: Boolean(data?.available_languages?.length)
      };
    } catch (error) {
      console.error('Failed to fetch video metadata:', error);
      return null;
    }
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
  ,
  /**
   * Process a raw transcript object (as returned from backend) into segments and character-based chunks.
   * Returns { segments, chunks } where segments are { startMs, endMs, text } and chunks are { startMs, endMs, text }.
   */
  processTranscriptRaw(raw: any, maxChars: number = 3000, overlapChars: number = 400) {
    return transcriptUtils.processRawTranscript(raw, maxChars, overlapChars);
  }
};
