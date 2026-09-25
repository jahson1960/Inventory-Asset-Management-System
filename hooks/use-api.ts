'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined>,
): UseApiResult<T> {
  const [data, setData] = useState<T>();
  const [fetching, setFetching] = useState(() => Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    // This hook is a minimal fetch-on-mount/dep-change helper (no data-fetching library in
    // scope for Phase 1); marking the start of an in-flight request is the standard shape for
    // that pattern, not an accidental derived-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);
    setError(null);

    api
      .get<T>(path, query)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(query ?? {}), nonce]);

  return { data, loading: Boolean(path) && fetching, error, refetch };
}
