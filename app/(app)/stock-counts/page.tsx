'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, StockCountSessionRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
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

  return (
    <div>
      <PageHeader
        title="Stock Counts"
        description="Physical stock-taking sessions with system-vs-physical variance tracking."
        action={
          <Link href="/stock-counts/new">
            <Button>New Session</Button>
          </Link>
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
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
