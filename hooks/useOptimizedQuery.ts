import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger, getErrorMessage } from '@/lib/logger';

interface UseOptimizedQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<{ data: T | null; error: any }>;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  cacheTime?: number; // in milliseconds
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  refetchInterval,
  onSuccess,
  onError,
  cacheTime = 5 * 60 * 1000 // 5 minutes default
}: UseOptimizedQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      // Check cache first
      const cached = queryCache.get(queryKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        logger.log(`📦 Cache hit for: ${queryKey}`);
        setData(cached.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await queryFn();

      if (!mountedRef.current) return;

      if (result.error) {
        const errorMsg = getErrorMessage(result.error);
        setError(errorMsg);
        onError?.(errorMsg);
      } else if (result.data) {
        // Update cache
        queryCache.set(queryKey, {
          data: result.data,
          timestamp: Date.now()
        });

        setData(result.data);
        onSuccess?.(result.data);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const errorMsg = getErrorMessage(err);
      logger.error('Query error:', err);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [queryKey, queryFn, enabled, onSuccess, onError, cacheTime]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    // Setup refetch interval if specified
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refetchInterval, enabled]);

  const refetch = useCallback(() => {
    // Invalidate cache for this query
    queryCache.delete(queryKey);
    return fetchData();
  }, [queryKey, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook for optimized user data fetching
 */
export function useUserData() {
  const supabase = createClient();

  return useOptimizedQuery({
    queryKey: 'user-data',
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: null };
      }

      const result = await supabase
        .from('users')
        .select('*, companies(*)')
        .eq('id', user.id)
        .single();

      return result;
    },
    cacheTime: 10 * 60 * 1000 // 10 minutes cache
  });
}

/**
 * Clear all query cache
 */
export function clearQueryCache() {
  queryCache.clear();
  logger.log('🗑️ Query cache cleared');
}

/**
 * Clear specific query from cache
 */
export function invalidateQuery(queryKey: string) {
  queryCache.delete(queryKey);
  logger.log(`🗑️ Cache invalidated for: ${queryKey}`);
}
