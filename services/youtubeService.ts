export const youtubeService = {
  getVideoMetadata: async (id: string) => ({ title: "Mock Video", description: "Desc", duration: 300, hasTranscript: true }),
  extractTranscript: async (id: string, lang?: string) => ({ success: true, transcript: "Mock transcript content..." }),
  saveQuizAsAssessment: async (lessonId: number, data: any) => { 
      // Simulate backend save
      console.log('Saving quiz to backend:', data);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true }; 
  }
};