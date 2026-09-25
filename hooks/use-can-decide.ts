'use client';

import { useApi } from './use-api';
import type { Paginated, PendingApprovalItem, WorkflowEntityType } from '@/lib/types';

export function useCanDecide(entityType: WorkflowEntityType, entityId: string, isPending: boolean) {
  const { data } = useApi<Paginated<PendingApprovalItem>>(isPending ? '/approvals/pending' : null, { pageSize: 1000 });
  return Boolean(data?.items.some((item) => item.entityType === entityType && item.entityId === entityId));
}
