'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, StockCountSessionRecord } from '@/lib/types';
import { fetchAllForExport } from '@/lib/export-table';
import { PageHeader } from '@/components/ui/page-header';
import { ExportMenu } from '@/components/ui/export-menu';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { Pagination } from '@/components/ui/pagination';

export default function StockCountsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: sessions, total, page, setPage, totalPages, loading, error } = usePaginatedApi<StockCountSessionRecord>('/stock-count-sessions', pageSize);

  const exportColumns = [
    { header: 'Name', value: (s: StockCountSessionRecord) => s.name },
    { header: 'Location', value: (s: StockCountSessionRecord) => s.location?.name ?? '' },
    { header: 'Status', value: (s: StockCountSessionRecord) => s.status },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Counts"
        description="Physical stock-taking sessions with system-vs-physical variance tracking."
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="stock-counts"
              columns={exportColumns}
              fetchRows={() => fetchAllForExport<StockCountSessionRecord>('/stock-count-sessions')}
            />
            <Link href="/stock-counts/new">
              <Button>New Session</Button>
            </Link>
          </div>
        }
      />

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <EmptyState message="No stock count sessions yet." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Location</Th>
                    <Th>Status</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {sessions.map((s) => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-slate-900">{s.name}</Td>
                      <Td>{s.location?.name ?? '—'}</Td>
                      <Td>
                        <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                      </Td>
                      <Td>
                        <Link href={`/stock-counts/${s.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                          View
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            <div className="md:hidden">
              <MobileCardList
                rows={sessions}
                keyField={(s) => s.id}
                title={(s) => s.name}
                subtitle={(s) => s.location?.name ?? null}
                badge={(s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge>}
                actions={(s) => (
                  <Link href={`/stock-counts/${s.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                    View
                  </Link>
                )}
                emptyMessage="No stock count sessions yet."
              />
            </div>
          </>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
