'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { AssetAssignment, DisplaySettingsRecord, EquipmentLoanRequestRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';
import { cn } from '@/lib/cn';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

const TABS = [
  { key: 'requests', label: 'Loan Requests' },
  { key: 'on-loan', label: 'Currently On Loan' },
  { key: 'due-today', label: 'Due Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function LoansPage() {
  const [tab, setTab] = useState<TabKey>('requests');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const adminDefault = displaySettings?.cardViewLists.includes('loans') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('loans', adminDefault);

  return (
    <div>
      <PageHeader
        title="Equipment Loans"
        description="Temporary equipment loans with return tracking."
        action={
          <div className="flex items-center gap-2">
            {tab === 'requests' && <ViewModeToggle mode={mode} onChange={setMode} />}
            <Link href="/loans/new">
              <Button>New Loan Request</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium',
              tab === t.key ? 'border-gold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? <LoanRequestsTable mode={mode} pageSize={pageSize} /> : <LoansTable filter={tab} pageSize={pageSize} />}
    </div>
  );
}

function LoanRequestsTable({ mode, pageSize }: { mode: 'TABLE' | 'CARD'; pageSize: number }) {
  const { items: requests, total, page, setPage, totalPages, loading, error } = usePaginatedApi<EquipmentLoanRequestRecord>(
    '/loan-requests',
    pageSize,
  );

  if (loading) return <PageLoading />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <>
      <ExpandableList<EquipmentLoanRequestRecord>
        items={requests}
        mode={mode}
        enablePrint
        getRowKey={(r) => r.id}
        emptyMessage="No loan requests yet."
        viewFullHref={(r) => `/loans/${r.id}`}
        columns={[
          { header: 'Asset', render: (r) => <span className="font-medium text-slate-900">{r.asset?.name ?? r.assetId}</span> },
          { header: 'Requested by', render: (r) => (r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—') },
          { header: 'Expected return', render: (r) => new Date(r.expectedReturnDate).toLocaleDateString() },
          { header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]}
        renderCard={(r) => (
          <div className="space-y-1">
            <p className="font-medium text-slate-900">{r.asset?.name ?? r.assetId}</p>
            <p className="text-xs text-slate-500">{r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'}</p>
            <p className="text-xs text-slate-500">Due {new Date(r.expectedReturnDate).toLocaleDateString()}</p>
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
          </div>
        )}
        renderExpanded={(r) => (
          <div className="space-y-1.5 text-sm">
            <ExpandedRow label="Asset" value={r.asset?.name ?? r.assetId} />
            <ExpandedRow label="Requested by" value={r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : '—'} />
            <ExpandedRow label="Department" value={r.department?.name ?? '—'} />
            <ExpandedRow label="Purpose" value={r.purpose ?? '—'} />
            <ExpandedRow label="Expected return" value={new Date(r.expectedReturnDate).toLocaleDateString()} />
          </div>
        )}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
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

function LoansTable({ filter, pageSize }: { filter: string; pageSize: number }) {
  const { items: loans, total, page, setPage, totalPages, loading, error } = usePaginatedApi<AssetAssignment>('/loans', pageSize, {
    status: filter,
  });

  return (
    <>
      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : loans.length === 0 ? (
          <EmptyState message="Nothing here." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Asset</Th>
                <Th>Borrower</Th>
                <Th>Issued</Th>
                <Th>Expected return</Th>
                <Th>Returned</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loans.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-medium text-slate-900">{l.asset?.name ?? l.assetId}</Td>
                  <Td>{l.staff ? `${l.staff.firstName} ${l.staff.lastName}` : '—'}</Td>
                  <Td>{new Date(l.assignedAt).toLocaleDateString()}</Td>
                  <Td>{l.expectedReturnDate ? new Date(l.expectedReturnDate).toLocaleDateString() : '—'}</Td>
                  <Td>{l.returnedAt ? new Date(l.returnedAt).toLocaleDateString() : '—'}</Td>
                  <Td>
                    <Badge tone={ASSIGNMENT_STATUS_TONE[l.status]}>{ASSIGNMENT_STATUS_LABELS[l.status]}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
  );
}
