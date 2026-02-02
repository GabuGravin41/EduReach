import { useQuery } from '@tanstack/react-query';
import communityAnalyticsService, { LeaderboardEntry, TrendingTopic } from '../services/communityAnalyticsService';

const COMMUNITY_ANALYTICS_KEYS = {
  leaderboard: ['community', 'leaderboard'] as const,
  trending: ['community', 'trending'] as const,
};

export const useCommunityLeaderboard = () => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: COMMUNITY_ANALYTICS_KEYS.leaderboard,
    queryFn: communityAnalyticsService.getLeaderboard,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommunityTrendingTopics = () => {
  return useQuery<TrendingTopic[]>({
    queryKey: COMMUNITY_ANALYTICS_KEYS.trending,
    queryFn: communityAnalyticsService.getTrendingTopics,
    staleTime: 5 * 60 * 1000,
  });
};
