'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { InventoryRequestRecord, DisplaySettingsRecord } from '@/lib/types';
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

export default function InventoryRequestsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: requests, total, page, setPage, totalPages, loading, error } = usePaginatedApi<InventoryRequestRecord>('/inventory-requests', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('inventoryRequests') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('inventoryRequests', adminDefault);

  return (
    <div>
      <PageHeader
        title="Inventory Requests"
        description="Requests for consumable inventory, routed through the configured approval chain."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <Link href="/inventory-requests/new">
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
        <ExpandableList<InventoryRequestRecord>
          items={requests}
          mode={mode}
          enablePrint
          getRowKey={(r) => r.id}
          emptyMessage="No inventory requests yet."
          viewFullHref={(r) => `/inventory-requests/${r.id}`}
          columns={[
            { header: 'Item', render: (r) => <span className="font-medium text-slate-900">{r.item?.name ?? r.itemId}</span> },
            { header: 'Quantity', render: (r) => `${r.quantityRequested} ${r.unit?.code ?? ''}` },
            { header: 'Requested by', render: (r) => (r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—') },
            { header: 'Department', render: (r) => r.department?.name ?? '—' },
            { header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          ]}
          renderCard={(r) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{r.item?.name ?? r.itemId}</p>
              <p className="text-xs text-slate-500">
                {r.quantityRequested} {r.unit?.code ?? ''}
              </p>
              <p className="text-xs text-slate-500">{r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'}</p>
              <p className="text-xs text-slate-500">{r.department?.name ?? '—'}</p>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </div>
          )}
          renderExpanded={(r) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Item" value={r.item?.name ?? r.itemId} />
              <ExpandedRow label="Quantity" value={`${r.quantityRequested} ${r.unit?.code ?? ''}`} />
              <ExpandedRow label="Requested by" value={r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'} />
              <ExpandedRow label="Department" value={r.department?.name ?? '—'} />
              <ExpandedRow label="Store" value={r.location?.name ?? '—'} />
              <ExpandedRow label="Purpose" value={r.purpose ?? '—'} />
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
