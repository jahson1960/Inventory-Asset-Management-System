'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import type { AssetAssignment, DisplaySettingsRecord } from '@/lib/types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

const STATUS_FILTERS = [
  { value: 'active', label: 'Currently assigned' },
  { value: 'RETURN_PENDING', label: 'Return pending' },
  { value: 'RETURNED', label: 'Returned' },
  { value: '', label: 'All' },
] as const;

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('active');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const adminDefault = displaySettings?.cardViewLists.includes('assignments') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('assignments', adminDefault);
  const {
    items: assignments,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refetch,
  } = usePaginatedApi<AssetAssignment>('/assignments', pageSize, {
    status: status === 'active' || status === '' ? undefined : status,
    excludeReturned: status === 'active' ? true : undefined,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();

  async function onRequestReturn(id: string) {
    const ok = await confirm({
      title: 'Request to return this asset?',
      message: 'A custodian or branch admin will be notified to confirm the return.',
    });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/assignments/${id}/request-return`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to request return');
    }
  }

  async function onReturn(id: string, alreadyRequested: boolean) {
    const ok = await confirm({
      title: alreadyRequested ? 'Confirm this return?' : 'Return this asset?',
      message: 'The assignment will be closed and the asset marked back in store.',
    });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/assignments/${id}/return`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to return asset');
    }
  }

  function renderActions(a: AssetAssignment) {
    const isOwnAssignment = Boolean(user && a.staff?.userId === user.id);
    if (a.status === 'RETURNED') return null;
    return (
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {a.status === 'ACTIVE' && isOwnAssignment && (
          <button onClick={() => onRequestReturn(a.id)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            Request Return
          </button>
        )}
        {(a.status === 'ACTIVE' || a.status === 'RETURN_PENDING') && (
          <RequirePermission permission="assignments.manage">
            <button
              onClick={() => onReturn(a.id, a.status === 'RETURN_PENDING')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {a.status === 'RETURN_PENDING' ? 'Confirm Return' : 'Return'}
            </button>
          </RequirePermission>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Permanent asset assignments across the organization."
        action={<ViewModeToggle mode={mode} onChange={setMode} />}
      />

      <div className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          <ExpandableList<AssetAssignment>
            items={assignments}
            mode={mode}
            getRowKey={(a) => a.id}
            emptyMessage="No assignments found."
            viewFullHref={(a) => `/assets/${a.assetId}`}
            columns={[
              {
                header: 'Asset',
                render: (a) => (
                  <Link href={`/assets/${a.assetId}`} className="font-medium text-slate-900 hover:underline">
                    {a.asset?.name ?? a.assetId}
                  </Link>
                ),
              },
              {
                header: 'Staff',
                render: (a) =>
                  a.staff ? (
                    <Link href={`/staff/${a.staffId}`} className="hover:underline">
                      {a.staff.firstName} {a.staff.lastName}
                    </Link>
                  ) : (
                    a.staffId
                  ),
              },
              { header: 'Department', render: (a) => a.staff?.department?.name ?? '—' },
              { header: 'Assigned', render: (a) => new Date(a.assignedAt).toLocaleDateString() },
              {
                header: 'Acknowledged',
                render: (a) => <Badge tone={a.acknowledged ? 'green' : 'amber'}>{a.acknowledged ? 'Yes' : 'Pending'}</Badge>,
              },
              {
                header: 'Status',
                render: (a) => <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>,
              },
              { header: '', render: renderActions },
            ]}
            renderCard={(a) => (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{a.asset?.name ?? a.assetId}</p>
                <p className="text-xs text-slate-500">{a.staff ? `${a.staff.firstName} ${a.staff.lastName}` : a.staffId}</p>
                <p className="text-xs text-slate-500">{a.staff?.department?.name ?? '—'}</p>
                <p className="text-xs text-slate-500">{new Date(a.assignedAt).toLocaleDateString()}</p>
                <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                {renderActions(a) && <div className="pt-1">{renderActions(a)}</div>}
              </div>
            )}
            renderExpanded={(a) => (
              <div className="space-y-1.5 text-sm">
                <ExpandedRow label="Asset" value={a.asset?.name ?? a.assetId} />
                <ExpandedRow label="Staff" value={a.staff ? `${a.staff.firstName} ${a.staff.lastName}` : a.staffId} />
                <ExpandedRow label="Department" value={a.staff?.department?.name ?? '—'} />
                <ExpandedRow label="Assigned" value={new Date(a.assignedAt).toLocaleDateString()} />
                <ExpandedRow label="Acknowledged" value={a.acknowledged ? 'Yes' : 'Pending'} />
                <ExpandedRow label="Status" value={ASSIGNMENT_STATUS_LABELS[a.status]} />
              </div>
            )}
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ExpandedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
