const apiClient = {
  get: async (url: string) => ({ data: {} }),
  post: async (url: string, body: any) => {
    // Mock response for transcript
    if (url.includes('extract-transcript')) {
        return {
            data: {
                success: true,
                transcript: { transcript: "Mock transcript content for video...", language: "en" },
                metadata: { title: "Mock Video Title" }
            }
        };
    }
    if (url.includes('save-notes')) return { data: { success: true } };
    return { data: {} };
  },
};
export default apiClient;