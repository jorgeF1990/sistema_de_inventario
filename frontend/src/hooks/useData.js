import { useState, useEffect, useCallback, useRef } from 'react';
import { cache } from '../utils/cache';

export function useData(fetchFn, cacheKey, options = {}) {
  const { 
    initialData = null, 
    ttl = 60000,
    enabled = true,
    dependencies = []
  } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!force && cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetchFn();
      const result = response.data || response;
      setData(result);
      if (cacheKey) {
        cache.set(cacheKey, result, ttl);
      }
      setError(null);
    } catch (err) {
      setError(err);
      const cached = cache.get(cacheKey);
      if (cached) setData(cached);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, cacheKey, ttl, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      cache.remove(cacheKey);
    }
    return fetchData(true);
  }, [fetchData, cacheKey]);

  return { data, loading, error, refetch };
}