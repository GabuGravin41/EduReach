import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface OptimizedQueryOptions {
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
  retry?: number | boolean;
  retryDelay?: number;
  placeholderData?: any;
  keepPreviousData?: boolean;
}

interface OptimizedMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  invalidateQueries?: string[];
  updateCache?: (oldData: any, newData: any) => any;
}

/**
 * Optimized query hook with intelligent caching and performance features
 */
export const useOptimizedQuery = <T = any>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: OptimizedQueryOptions = {}
) => {
  const defaultOptions: OptimizedQueryOptions = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    keepPreviousData: true,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return useQuery({
    queryKey,
    queryFn,
    ...mergedOptions,
  });
};

/**
 * Optimized mutation hook with cache invalidation and updates
 */
export const useOptimizedMutation = <T = any, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options: OptimizedMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      // Update cache if specified
      if (options.updateCache) {
        // This would need specific implementation based on the data structure
      }

      options.onSuccess?.(data);
    },
    onError: options.onError,
    retry: 1,
  });
};

/**
 * Hook for paginated data with optimized caching
 */
export const usePaginatedQuery = <T = any>(
  baseQueryKey: string,
  queryFn: (page: number, limit: number) => Promise<T>,
  page: number = 1,
  limit: number = 20,
  options: OptimizedQueryOptions = {}
) => {
  const queryKey = useMemo(() => [baseQueryKey, 'paginated', page, limit], [baseQueryKey, page, limit]);

  return useOptimizedQuery(
    queryKey,
    () => queryFn(page, limit),
    {
      ...options,
      keepPreviousData: true, // Keep previous page data while loading new page
      staleTime: 2 * 60 * 1000, // 2 minutes for paginated data
    }
  );
};

/**
 * Hook for infinite scroll queries
 */
export const useInfiniteOptimizedQuery = <T = any>(
  queryKey: string[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<T>,
  options: OptimizedQueryOptions = {}
) => {
  const { useInfiniteQuery } = require('@tanstack/react-query');
  
  return useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage: any) => {
      // Implement based on your API response structure
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook for debounced search queries
 */
export const useSearchQuery = <T = any>(
  searchTerm: string,
  searchFn: (term: string) => Promise<T>,
  debounceMs: number = 300,
  options: OptimizedQueryOptions = {}
) => {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  return useOptimizedQuery(
    ['search', debouncedSearchTerm],
    () => searchFn(debouncedSearchTerm),
    {
      ...options,
      enabled: debouncedSearchTerm.length > 2, // Only search if term is longer than 2 chars
      staleTime: 1 * 60 * 1000, // 1 minute for search results
    }
  );
};

/**
 * Hook for optimistic updates
 */
export const useOptimisticMutation = <T = any, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  queryKey: string[],
  optimisticUpdateFn: (oldData: any, variables: V) => any
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any) => optimisticUpdateFn(old, variables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

/**
 * Custom debounce hook
 */
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for background sync
 */
export const useBackgroundSync = (
  queryKey: string[],
  syncFn: () => Promise<any>,
  intervalMs: number = 30000 // 30 seconds
) => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const interval = setInterval(async () => {
      // Only sync if the window is visible and online
      if (document.visibilityState === 'visible' && navigator.onLine) {
        try {
          const data = await syncFn();
          queryClient.setQueryData(queryKey, data);
        } catch (error) {
          console.error('Background sync failed:', error);
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [queryKey, syncFn, intervalMs, queryClient]);
};

/**
 * Hook for prefetching related data
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    (queryKey: string[], queryFn: () => Promise<any>, staleTime: number = 5 * 60 * 1000) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    },
    [queryClient]
  );

  return { prefetchQuery };
};

// Export React import for the debounce hook
import React from 'react';
