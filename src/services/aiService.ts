import apiClient from './apiClient';
import type { QuizQuestion, ChatMessage } from '../types';

const aiService = {
  async chat({ message, context }: { message: string, context: string }): Promise<string> {
    try {
      const response = await apiClient.post<{response: string}>('/ai/chat/', 
        { message, context },
        { timeout: 60000 } // Increased timeout for large contexts
      );
      return response.data.response;
    } catch (error) {
      console.error('AI Chat Error:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. The transcript might be too long. Please try again.');
      }
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async generateQuiz({ transcript }: { transcript: string }): Promise<QuizQuestion[]> {
    try {
      const response = await apiClient.post<{questions: QuizQuestion[]}>('/ai/generate-quiz/', 
        { transcript },
        { timeout: 90000 } // Increased timeout for quiz generation
      );

      if (!Array.isArray(response.data?.questions)) {
        throw new Error('Invalid quiz format received');
      }
      return response.data.questions;
    } catch (error) {
      console.error('AI Service Error:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Quiz generation timed out. Please try with a shorter transcript.');
      }
      throw new Error(`Quiz generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

export default aiService;
