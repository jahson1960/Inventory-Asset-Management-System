'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, InventoryItem } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

export default function InventoryItemsPage() {
  const [search, setSearch] = useState('');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items, total, page, setPage, totalPages, loading, error } = usePaginatedApi<InventoryItem>('/inventory-items', pageSize, { search: search || undefined });
  const adminDefault = displaySettings?.cardViewLists.includes('inventory') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('inventory', adminDefault);

  return (
    <div>
      <PageHeader
        title="Inventory Item Catalogue"
        description="Consumable inventory and controlled equipment tracked by quantity."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <RequirePermission permission="inventoryItems.manage">
              <Link href="/inventory/new">
                <Button>New Item</Button>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search item code, name, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<InventoryItem>
          items={items}
          mode={mode}
          getRowKey={(item) => item.id}
          emptyMessage="No inventory items yet."
          viewFullHref={(item) => `/inventory/${item.id}`}
          columns={[
            { header: 'Item Code', render: (i) => <span className="font-mono text-xs text-slate-600">{i.itemCode}</span> },
            { header: 'Name', render: (i) => <span className="font-medium text-slate-900">{i.name}</span> },
            { header: 'Category', render: (i) => i.category?.name ?? '—' },
            { header: 'Base Unit', render: (i) => i.baseUnit?.code ?? '—' },
            { header: 'Min Level', render: (i) => i.minStockLevel },
            {
              header: 'Status',
              render: (i) => <Badge tone={i.isActive ? 'green' : 'neutral'}>{i.isActive ? 'Active' : 'Inactive'}</Badge>,
            },
          ]}
          renderCard={(item) => (
            <div className="space-y-1">
              <p className="font-mono text-xs text-slate-500">{item.itemCode}</p>
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{item.category?.name ?? '—'}</p>
              <Badge tone={item.isActive ? 'green' : 'neutral'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          )}
          renderExpanded={(item) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Category" value={item.category?.name ?? '—'} />
              <ExpandedRow label="Base unit" value={item.baseUnit?.code ?? '—'} />
              <ExpandedRow label="Min stock level" value={String(item.minStockLevel)} />
              <ExpandedRow label="Max stock level" value={item.maxStockLevel ? String(item.maxStockLevel) : '—'} />
              <ExpandedRow label="Unit cost" value={item.unitCost ? `₦${Number(item.unitCost).toLocaleString()}` : '—'} />
              <ExpandedRow label="Preferred supplier" value={item.preferredSupplier ?? '—'} />
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
