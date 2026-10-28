'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { Asset, AssetStatus, CustomPrintSettingsRecord, DisplaySettingsRecord } from '@/lib/types';
import { DEFAULT_CUSTOM_PRINT_SETTINGS, printCustomText } from '@/lib/custom-print';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDepartmentOptions, useUserOptions } from '@/hooks/use-filter-options';
import { Modal } from '@/components/ui/modal';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';
import { PrinterIcon } from '@/components/icons/form-icons';

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
  const [departmentId, setDepartmentId] = useState('');
  const [custodianId, setCustodianId] = useState('');
  const [customPrintOpen, setCustomPrintOpen] = useState(false);
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const departmentOptions = useDepartmentOptions();
  const userOptions = useUserOptions();
  const { items: assets, total, page, setPage, totalPages, loading, error } = usePaginatedApi<Asset>('/assets', pageSize, {
    search: search || undefined,
    status: status || undefined,
    departmentId: departmentId || undefined,
    custodianId: custodianId || undefined,
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
            <Button variant="secondary" onClick={() => setCustomPrintOpen(true)}>
              <PrinterIcon className="h-4 w-4" />
              Custom Print
            </Button>
            <RequirePermission permission="assets.manage">
              <Link href="/assets/new">
                <Button>New Asset</Button>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      <CustomPrintModal open={customPrintOpen} onClose={() => setCustomPrintOpen(false)} />

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
        <SearchableSelect
          value={departmentId}
          onChange={setDepartmentId}
          options={departmentOptions}
          placeholder="All departments"
          searchPlaceholder="Search departments…"
          className="max-w-xs"
        />
        <SearchableSelect
          value={custodianId}
          onChange={setCustodianId}
          options={userOptions}
          placeholder="All custodians"
          searchPlaceholder="Search people…"
          className="max-w-xs"
        />
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

/** Prints an arbitrary rich-text note (not an asset tag or a condition) using the Custom
 *  Printing template configured at Settings → Printing. The text area is a plain
 *  contentEditable with a minimal bold/italic/underline toolbar via document.execCommand —
 *  the resulting HTML is handed straight to printCustomText(), which sanitizes it before use. */
function CustomPrintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useApi<CustomPrintSettingsRecord>('/settings/custom-print');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => {
    if (open && editorRef.current) {
      editorRef.current.innerHTML = '';
      setIsEmpty(true);
      setActiveFormats({ bold: false, italic: false, underline: false });
    }
  }, [open]);

  function updateActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    editorRef.current?.focus();
    document.execCommand(command);
    updateActiveFormats();
  }

  function onInput() {
    setIsEmpty(!editorRef.current?.textContent?.trim());
  }

  function onPrint() {
    if (!editorRef.current || !editorRef.current.textContent?.trim()) return;
    printCustomText({ settings: settings ?? DEFAULT_CUSTOM_PRINT_SETTINGS, html: editorRef.current.innerHTML });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Custom Print">
      <div className="mb-2 flex gap-1 rounded-md border border-slate-300 bg-slate-50 p-1">
        <ToolbarButton active={activeFormats.bold} label="Bold" onClick={() => applyFormat('bold')}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton active={activeFormats.italic} label="Italic" onClick={() => applyFormat('italic')}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton active={activeFormats.underline} label="Underline" onClick={() => applyFormat('underline')}>
          <span className="underline">U</span>
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        data-placeholder="Type what you want printed…"
        className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onPrint} disabled={isEmpty}>
          <PrinterIcon className="h-4 w-4" />
          Print
        </Button>
      </div>
    </Modal>
  );
}

function ToolbarButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Prevents the editor's text selection from collapsing before execCommand runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('flex h-7 w-7 items-center justify-center rounded text-sm', active ? 'bg-gold text-white' : 'text-slate-600 hover:bg-slate-200')}
    >
      {children}
    </button>
  );
}
