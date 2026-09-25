'use client';

import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, PendingApprovalItem, WorkflowEntityType } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

const ENTITY_ROUTES: Record<WorkflowEntityType, string> = {
  ASSET_REQUEST: '/asset-requests',
  INVENTORY_REQUEST: '/inventory-requests',
  EQUIPMENT_LOAN: '/loans',
  ASSET_TRANSFER: '/asset-transfers',
  INVENTORY_TRANSFER: '/inventory-transfers',
  MAINTENANCE_REQUEST: '/maintenance',
};

const ENTITY_LABELS: Record<WorkflowEntityType, string> = {
  ASSET_REQUEST: 'Asset Request',
  INVENTORY_REQUEST: 'Inventory Request',
  EQUIPMENT_LOAN: 'Equipment Loan',
  ASSET_TRANSFER: 'Asset Transfer',
  INVENTORY_TRANSFER: 'Inventory Transfer',
  MAINTENANCE_REQUEST: 'Maintenance Request',
};

function fullHref(item: PendingApprovalItem): string {
  return `${ENTITY_ROUTES[item.entityType]}/${item.entityId}`;
}

export default function ApprovalsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const {
    items: pending,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
  } = usePaginatedApi<PendingApprovalItem>('/approvals/pending', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('approvals') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('approvals', adminDefault);

  return (
    <div>
      <PageHeader
        title="My Approvals"
        description="Items awaiting your decision across every workflow type."
        action={<ViewModeToggle mode={mode} onChange={setMode} />}
      />

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<PendingApprovalItem>
          items={pending}
          mode={mode}
          enablePrint
          getRowKey={(item) => `${item.entityType}-${item.entityId}`}
          emptyMessage="Nothing pending your approval right now."
          viewFullHref={fullHref}
          columns={[
            { header: 'Type', render: (item) => <Badge tone="blue">{ENTITY_LABELS[item.entityType]}</Badge> },
            { header: 'Summary', render: (item) => <span className="font-medium text-slate-900">{item.summary}</span> },
            { header: 'Requested by', render: (item) => item.requestedByName ?? '—' },
            { header: 'Department', render: (item) => item.departmentName ?? '—' },
            { header: 'Status', render: (item) => `Awaiting ${item.requiredRole.replace('_', ' ')}` },
            { header: 'Submitted', render: (item) => new Date(item.createdAt).toLocaleDateString() },
          ]}
          renderCard={(item) => (
            <div className="space-y-1">
              <Badge tone="blue">{ENTITY_LABELS[item.entityType]}</Badge>
              <p className="font-medium text-slate-900">{item.summary}</p>
              {item.requestedByName && (
                <p className="text-xs text-slate-500">
                  {item.requestedByName}
                  {item.departmentName ? ` · ${item.departmentName}` : ''}
                </p>
              )}
              <p className="text-xs text-slate-500">Awaiting {item.requiredRole.replace('_', ' ')}</p>
              <p className="text-xs text-slate-500">Submitted {new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
          )}
          renderExpanded={(item) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Type" value={ENTITY_LABELS[item.entityType]} />
              <ExpandedRow label="Summary" value={item.summary} />
              <ExpandedRow label="Requested by" value={item.requestedByName ?? '—'} />
              <ExpandedRow label="Department" value={item.departmentName ?? '—'} />
              <ExpandedRow label="Status" value={`Awaiting ${item.requiredRole.replace('_', ' ')}`} />
              <ExpandedRow label="Submitted" value={new Date(item.createdAt).toLocaleDateString()} />
            </div>
          )}
        />
      )}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
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
