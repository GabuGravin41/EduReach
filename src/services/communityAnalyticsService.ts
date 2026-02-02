import apiClient from './api';

export interface LeaderboardEntry {
  username: string;
  points: number;
  role?: string;
}

export interface TrendingTopic {
  tag: string;
  score?: number;
}

const BASE = '/community';

export const communityAnalyticsService = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const { data } = await apiClient.get(`${BASE}/leaderboard/`);
      return data;
    } catch (error) {
      // If backend is not ready yet, fail softly so UI can fall back to static data
      console.warn('communityAnalyticsService.getLeaderboard failed, falling back to static data', error);
      return [];
    }
  },

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    try {
      const { data } = await apiClient.get(`${BASE}/trending/`);
      return data;
    } catch (error) {
      console.warn('communityAnalyticsService.getTrendingTopics failed, falling back to static data', error);
      return [];
    }
  },
};

export default communityAnalyticsService;
