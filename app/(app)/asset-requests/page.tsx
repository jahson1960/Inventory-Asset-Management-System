'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { AssetRequestRecord, DisplaySettingsRecord } from '@/lib/types';
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

export default function AssetRequestsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: requests, total, page, setPage, totalPages, loading, error } = usePaginatedApi<AssetRequestRecord>('/asset-requests', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('assetRequests') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('assetRequests', adminDefault);

  return (
    <div>
      <PageHeader
        title="Asset Requests"
        description="Requests for new assets, routed through the configured approval chain."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <Link href="/asset-requests/new">
              <Button>New Request</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<AssetRequestRecord>
          items={requests}
          mode={mode}
          enablePrint
          getRowKey={(r) => r.id}
          emptyMessage="No asset requests yet."
          viewFullHref={(r) => `/asset-requests/${r.id}`}
          columns={[
            { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { header: 'Requested by', render: (r) => (r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—') },
            { header: 'Department', render: (r) => r.department?.name ?? '—' },
            { header: 'Est. cost', render: (r) => (r.estimatedCost ? `₦${Number(r.estimatedCost).toLocaleString()}` : '—') },
            { header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          ]}
          renderCard={(r) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">{r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'}</p>
              <p className="text-xs text-slate-500">{r.department?.name ?? '—'}</p>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
          )}
          renderExpanded={(r) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Quantity" value={String(r.quantity)} />
              <ExpandedRow label="Requested by" value={r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'} />
              <ExpandedRow label="Department" value={r.department?.name ?? '—'} />
              <ExpandedRow label="Category" value={r.category?.name ?? '—'} />
              <ExpandedRow label="Description" value={r.description ?? '—'} />
              <ExpandedRow label="Justification" value={r.justification ?? '—'} />
              <ExpandedRow label="Estimated cost" value={r.estimatedCost ? `₦${Number(r.estimatedCost).toLocaleString()}` : '—'} />
              {r.fulfilledAsset && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Fulfilled with</span>
                  <Link href={`/assets/${r.fulfilledAsset.id}`} className="text-gold-dark hover:underline">
                    {r.fulfilledAsset.assetTag} — {r.fulfilledAsset.name}
                  </Link>
                </div>
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
