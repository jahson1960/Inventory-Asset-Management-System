'use client';

import { useApi } from './use-api';
import type { Paginated, Department, CurrentUser } from '@/lib/types';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';

/** Full department list for a "filter by department" SearchableSelect — shared across every
 *  list page that needs one, so the fetch/shape-mapping isn't repeated per page. */
export function useDepartmentOptions(): SearchableSelectOption[] {
  const { data } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  return (data?.items ?? []).map((d) => ({ value: d.id, label: d.name }));
}

/** Full user/staff list for a "filter by person" SearchableSelect. */
export function useUserOptions(): SearchableSelectOption[] {
  const { data } = useApi<Paginated<CurrentUser>>('/users', { pageSize: 1000 });
  return (data?.items ?? []).map((u) => ({
    value: u.id,
    label: u.staffNumber ? `${u.firstName} ${u.lastName} (${u.staffNumber})` : `${u.firstName} ${u.lastName}`,
  }));
}
