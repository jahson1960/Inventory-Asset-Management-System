'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { Asset, AssetStatus, DisplaySettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

const STATUS_TONE: Record<AssetStatus, 'green' | 'blue' | 'amber' | 'neutral' | 'red'> = {
  IN_STORE: 'neutral',
  ASSIGNED: 'blue',
  UNDER_MAINTENANCE: 'amber',
  RETIRED: 'neutral',
  DISPOSED: 'red',
  LOST: 'red',
};

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: assets, total, page, setPage, totalPages, loading, error } = usePaginatedApi<Asset>('/assets', pageSize, {
    search: search || undefined,
    status: status || undefined,
  });
  const adminDefault = displaySettings?.cardViewLists.includes('assets') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('assets', adminDefault);

  return (
    <div>
      <PageHeader
        title="Asset Register"
        description="Fixed assets and controlled equipment across the organization."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <RequirePermission permission="assets.manage">
              <Link href="/assets/new">
                <Button>New Asset</Button>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search tag, name, serial…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          {(['IN_STORE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST'] as AssetStatus[]).map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<Asset>
          items={assets}
          mode={mode}
          getRowKey={(asset) => asset.id}
          emptyMessage="No assets found."
          viewFullHref={(asset) => `/assets/${asset.id}`}
          columns={[
            { header: 'Asset Tag', render: (a) => <span className="font-mono text-xs text-slate-600">{a.assetTag}</span> },
            { header: 'Name', render: (a) => <span className="font-medium text-slate-900">{a.name}</span> },
            { header: 'Category', render: (a) => a.category?.name ?? '—' },
            { header: 'Location', render: (a) => a.currentLocation?.name ?? '—' },
            {
              header: 'Custodian',
              render: (a) => (a.currentCustodian ? `${a.currentCustodian.firstName} ${a.currentCustodian.lastName}` : '—'),
            },
            { header: 'Status', render: (a) => <Badge tone={STATUS_TONE[a.status]}>{a.status.replace('_', ' ')}</Badge> },
          ]}
          renderCard={(asset) => (
            <div className="space-y-1">
              <p className="font-mono text-xs text-slate-500">{asset.assetTag}</p>
              <p className="font-medium text-slate-900">{asset.name}</p>
              <p className="text-xs text-slate-500">{asset.category?.name ?? '—'}</p>
              <p className="text-xs text-slate-500">
                {asset.currentCustodian ? `${asset.currentCustodian.firstName} ${asset.currentCustodian.lastName}` : '—'}
              </p>
              <Badge tone={STATUS_TONE[asset.status]}>{asset.status.replace('_', ' ')}</Badge>
            </div>
          )}
          renderExpanded={(asset) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Category" value={asset.category?.name ?? '—'} />
              <ExpandedRow label="Location" value={asset.currentLocation?.name ?? '—'} />
              <ExpandedRow
                label="Custodian"
                value={asset.currentCustodian ? `${asset.currentCustodian.firstName} ${asset.currentCustodian.lastName}` : '—'}
              />
              <ExpandedRow label="Condition" value={asset.condition} />
              <ExpandedRow label="Serial number" value={asset.serialNumber ?? '—'} />
              {asset.purchaseCost && (
                <ExpandedRow label="Purchase cost" value={`₦${Number(asset.purchaseCost).toLocaleString()}`} />
              )}
              <ExpandedRow
                label="Warranty ends"
                value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}
              />
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
