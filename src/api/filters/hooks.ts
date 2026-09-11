'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getFilters } from './api';
import type { Filter } from './types';

export function useFilters(resource: string) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedResourceRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchFilters = useCallback(async (res: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await getFilters(res);
      setFilters((prev) => {
        const incoming = response.filters;
        return JSON.stringify(prev) === JSON.stringify(incoming) ? prev : incoming;
      });
      fetchedResourceRef.current = res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch filters');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (fetchedResourceRef.current !== resource) {
      fetchFilters(resource);
    }
  }, [resource, fetchFilters]);

  return { filters, loading, error, refetch: () => fetchFilters(resource) };
}
