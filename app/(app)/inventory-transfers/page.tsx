'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { InventoryTransferRecord, DisplaySettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { RequirePermission } from '@/components/require-permission';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

export default function InventoryTransfersPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: transfers, total, page, setPage, totalPages, loading, error } = usePaginatedApi<InventoryTransferRecord>('/inventory-transfers', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('inventoryTransfers') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('inventoryTransfers', adminDefault);

  return (
    <div>
      <PageHeader
        title="Inventory Transfers"
        description="Move stock between stores, with approval."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <RequirePermission permission="inventoryTransfers.create">
              <Link href="/inventory-transfers/new">
                <Button>New Transfer</Button>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<InventoryTransferRecord>
          items={transfers}
          mode={mode}
          enablePrint
          getRowKey={(t) => t.id}
          emptyMessage="No inventory transfers yet."
          viewFullHref={(t) => `/inventory-transfers/${t.id}`}
          columns={[
            { header: 'Item', render: (t) => <span className="font-medium text-slate-900">{t.item?.name ?? t.itemId}</span> },
            { header: 'Quantity', render: (t) => `${t.quantity} ${t.unit?.code ?? ''}` },
            { header: 'From', render: (t) => t.fromLocation?.name ?? '—' },
            { header: 'To', render: (t) => t.toLocation?.name ?? '—' },
            { header: 'Status', render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
          ]}
          renderCard={(t) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{t.item?.name ?? t.itemId}</p>
              <p className="text-xs text-slate-500">
                {t.fromLocation?.name ?? '—'} → {t.toLocation?.name ?? '—'}
              </p>
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
            </div>
          )}
          renderExpanded={(t) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Item" value={t.item?.name ?? t.itemId} />
              <ExpandedRow label="Quantity" value={`${t.quantity} ${t.unit?.code ?? ''}`} />
              <ExpandedRow label="From" value={t.fromLocation?.name ?? '—'} />
              <ExpandedRow label="To" value={t.toLocation?.name ?? '—'} />
              <ExpandedRow label="Reason" value={t.reason ?? '—'} />
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
