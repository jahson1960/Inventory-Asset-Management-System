'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { MaintenanceRequestRecord, DisplaySettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

export default function MaintenancePage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: requests, total, page, setPage, totalPages, loading, error } = usePaginatedApi<MaintenanceRequestRecord>('/maintenance-requests', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('maintenance') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('maintenance', adminDefault);

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Reported faults, verification and repair history."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <Link href="/maintenance/new">
              <Button>Report Fault</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<MaintenanceRequestRecord>
          items={requests}
          mode={mode}
          enablePrint
          getRowKey={(r) => r.id}
          emptyMessage="No maintenance requests yet."
          viewFullHref={(r) => `/maintenance/${r.id}`}
          columns={[
            { header: 'Asset', render: (r) => <span className="font-medium text-slate-900">{r.asset?.name ?? r.assetId}</span> },
            { header: 'Fault', render: (r) => <span className="line-clamp-1 max-w-xs">{r.faultDescription}</span> },
            { header: 'Reported by', render: (r) => (r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : '—') },
            {
              header: 'Status',
              render: (r) => <Badge tone={statusTone(r.status)}>{r.status === 'FULFILLED' ? 'RESOLVED' : r.status}</Badge>,
            },
          ]}
          renderCard={(r) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{r.asset?.name ?? r.assetId}</p>
              <p className="line-clamp-2 text-xs text-slate-500">{r.faultDescription}</p>
              <p className="text-xs text-slate-500">{r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : '—'}</p>
              <Badge tone={statusTone(r.status)}>{r.status === 'FULFILLED' ? 'RESOLVED' : r.status}</Badge>
            </div>
          )}
          renderExpanded={(r) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Asset" value={r.asset?.name ?? r.assetId} />
              <ExpandedRow label="Reported by" value={r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : '—'} />
              <ExpandedRow label="Fault" value={r.faultDescription} />
              {r.status === 'FULFILLED' && (
                <>
                  <ExpandedRow label="Technician" value={r.technician ?? '—'} />
                  <ExpandedRow label="Vendor" value={r.vendor ?? '—'} />
                  <ExpandedRow label="Work performed" value={r.workPerformed ?? '—'} />
                  <ExpandedRow label="Parts used" value={r.partsUsed ?? '—'} />
                  <ExpandedRow label="Cost" value={r.cost ? `₦${Number(r.cost).toLocaleString()}` : '—'} />
                  <ExpandedRow
                    label="Next maintenance"
                    value={r.nextMaintenanceDate ? new Date(r.nextMaintenanceDate).toLocaleDateString() : '—'}
                  />
                  <ExpandedRow label="Condition after" value={r.assetConditionAfter ?? '—'} />
                </>
              )}
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
