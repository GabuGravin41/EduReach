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

export const communityAnalyticsService = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // No dedicated backend endpoint yet; keep API-free fallback to avoid noisy 404s.
    return [];
  },

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    return [];
  },
};

export default communityAnalyticsService;
