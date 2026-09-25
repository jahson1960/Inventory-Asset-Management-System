'use client';

import { useEffect, useState } from 'react';
import { useApi } from './use-api';
import type { Paginated } from '@/lib/types';

interface UsePaginatedApiResult<T> {
  items: T[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Wraps useApi with page-state management for endpoints returning `{items, total, page, pageSize}`.
 *  `pageSize` is the admin-configured default (Settings → Display); resets to page 1 whenever the
 *  path or any other query param changes, so a filter change never strands the viewer on an
 *  out-of-range page. */
export function usePaginatedApi<T>(
  path: string | null,
  pageSize: number,
  query?: Record<string, string | number | boolean | undefined>,
): UsePaginatedApiResult<T> {
  const [page, setPage] = useState(1);
  const queryKey = JSON.stringify(query ?? {});

  useEffect(() => {
    // Filters/path changed — the current page may no longer exist in the new result set.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [path, queryKey]);

  const { data, loading, error, refetch } = useApi<Paginated<T>>(path, { ...query, page, pageSize });

  const total = data?.total ?? 0;
  const effectivePageSize = data?.pageSize ?? pageSize;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  return {
    items: data?.items ?? [],
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refetch,
  };
}
