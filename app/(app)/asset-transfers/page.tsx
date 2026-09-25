'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { AssetTransferRecord, DisplaySettingsRecord } from '@/lib/types';
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

export default function AssetTransfersPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: transfers, total, page, setPage, totalPages, loading, error } = usePaginatedApi<AssetTransferRecord>('/asset-transfers', pageSize);
  const adminDefault = displaySettings?.cardViewLists.includes('assetTransfers') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('assetTransfers', adminDefault);

  return (
    <div>
      <PageHeader
        title="Asset Transfers"
        description="Move assets between locations, with approval and receiving acknowledgement."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <RequirePermission permission="assetTransfers.create">
              <Link href="/asset-transfers/new">
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
        <ExpandableList<AssetTransferRecord>
          items={transfers}
          mode={mode}
          enablePrint
          getRowKey={(t) => t.id}
          emptyMessage="No asset transfers yet."
          viewFullHref={(t) => `/asset-transfers/${t.id}`}
          columns={[
            { header: 'Asset', render: (t) => <span className="font-medium text-slate-900">{t.asset?.name ?? t.assetId}</span> },
            { header: 'From', render: (t) => t.fromLocation?.name ?? '—' },
            { header: 'To', render: (t) => t.toLocation?.name ?? '—' },
            { header: 'Status', render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
          ]}
          renderCard={(t) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{t.asset?.name ?? t.assetId}</p>
              <p className="text-xs text-slate-500">
                {t.fromLocation?.name ?? '—'} → {t.toLocation?.name ?? '—'}
              </p>
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
            </div>
          )}
          renderExpanded={(t) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Asset" value={t.asset?.name ?? t.assetId} />
              <ExpandedRow label="From" value={t.fromLocation?.name ?? '—'} />
              <ExpandedRow label="To" value={t.toLocation?.name ?? '—'} />
              <ExpandedRow label="Reason" value={t.reason ?? '—'} />
              <ExpandedRow label="New custodian" value={t.toCustodian ? `${t.toCustodian.firstName} ${t.toCustodian.lastName}` : 'Unchanged'} />
              <ExpandedRow label="Receiving acknowledged" value={t.receivingAcknowledged ? 'Yes' : 'Pending'} />
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
