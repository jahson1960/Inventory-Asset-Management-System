'use client';

import { useApi } from '@/hooks/use-api';
import type { ApprovalDecisionEntry, WorkflowEntityType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { statusTone } from '@/lib/status-tone';

export function ApprovalHistory({ entityType, entityId }: { entityType: WorkflowEntityType; entityId: string }) {
  const { data: history, loading } = useApi<ApprovalDecisionEntry[]>('/approvals/history', { entityType, entityId });

  if (loading) return null;
  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-400">No decisions recorded yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {history.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
          <div>
            <p className="font-medium text-slate-900">
              Step {entry.stepOrder} — {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : entry.actorUserId}
            </p>
            {entry.comments && <p className="text-slate-500">{entry.comments}</p>}
            <p className="text-xs text-slate-400">{new Date(entry.decidedAt).toLocaleString()}</p>
          </div>
          <Badge tone={statusTone(entry.decision)}>{entry.decision}</Badge>
        </li>
      ))}
    </ul>
  );
}
