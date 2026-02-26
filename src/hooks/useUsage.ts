import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export const USAGE_QUERY_KEY = ['users', 'usage'] as const;

export interface UsageData {
  assessments_used: number;
  assessments_limit: number | null;
  courses_used: number;
  courses_limit: number | null;
  ai_queries_used: number;
  ai_queries_limit: number | null;
  resets_at: string | null;
}

function parseUsageResponse(data: any): {
  assessments_used: number;
  assessments_limit: number;
  resets_at: string;
} {
  const limit = data.assessments_limit;
  return {
    assessments_used: Number(data.assessments_used) || 0,
    assessments_limit: limit == null ? Infinity : Number(limit),
    resets_at: data.resets_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Fetch current user's monthly usage (assessments, courses, AI). Enabled only when authenticated. */
export function useUsage(enabled: boolean = true) {
  const query = useQuery({
    queryKey: USAGE_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<UsageData>(API_ENDPOINTS.USER_USAGE);
      return parseUsageResponse(res.data);
    },
    staleTime: 60 * 1000,
    enabled,
  });
  return query;
}

export function useInvalidateUsage() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY });
}
