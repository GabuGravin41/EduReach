import apiClient from './api';

import { User } from './authService';

export interface LeaderboardData {
  top_users: User[];
  user_rank: number | null;
  user_stats: User;
}

export interface TrendingTopic {
  tag: string;
  score?: number;
}

export const communityAnalyticsService = {
  async getLeaderboard(): Promise<LeaderboardData> {
    const response = await apiClient.get('/users/leaderboard/');
    return response.data;
  },

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    return [];
  },
};

export default communityAnalyticsService;
