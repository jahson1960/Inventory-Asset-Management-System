'use client';

import { useApi } from './use-api';
import type { PendingApprovalItem, WorkflowEntityType } from '@/lib/types';

export function useCanDecide(entityType: WorkflowEntityType, entityId: string, isPending: boolean) {
  const { data } = useApi<PendingApprovalItem[]>(isPending ? '/approvals/pending' : null);
  return Boolean(data?.some((item) => item.entityType === entityType && item.entityId === entityId));
}
