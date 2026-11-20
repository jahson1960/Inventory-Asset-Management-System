'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, VerificationCampaignRecord } from '@/lib/types';
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
import { RequirePermission } from '@/components/require-permission';
import { Pagination } from '@/components/ui/pagination';

export default function VerificationCampaignsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: campaigns, total, page, setPage, totalPages, loading, error } = usePaginatedApi<VerificationCampaignRecord>(
    '/verification-campaigns',
    pageSize,
  );

  const exportColumns = [
    { header: 'Name', value: (c: VerificationCampaignRecord) => c.name },
    { header: 'Branch', value: (c: VerificationCampaignRecord) => c.branch?.name ?? '' },
    { header: 'Due', value: (c: VerificationCampaignRecord) => new Date(c.dueDate).toLocaleDateString() },
    { header: 'Status', value: (c: VerificationCampaignRecord) => c.status },
  ];

  return (
    <div>
      <PageHeader
        title="Verification Campaigns"
        description="Physical asset verification drives, tracked to completion."
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="verification-campaigns"
              columns={exportColumns}
              fetchRows={() => fetchAllForExport<VerificationCampaignRecord>('/verification-campaigns')}
            />
            <RequirePermission permission="verification.manage">
              <Link href="/verification/new">
                <Button>New Campaign</Button>
              </Link>
            </RequirePermission>
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
        ) : campaigns.length === 0 ? (
          <EmptyState message="No verification campaigns yet." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Branch</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {campaigns.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-medium text-slate-900">{c.name}</Td>
                      <Td>{c.branch?.name ?? '—'}</Td>
                      <Td>{new Date(c.dueDate).toLocaleDateString()}</Td>
                      <Td>
                        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                      </Td>
                      <Td>
                        <Link href={`/verification/${c.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
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
                rows={campaigns}
                keyField={(c) => c.id}
                title={(c) => c.name}
                subtitle={(c) => c.branch?.name ?? null}
                badge={(c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge>}
                fields={[{ label: 'Due', value: (c) => new Date(c.dueDate).toLocaleDateString() }]}
                actions={(c) => (
                  <Link href={`/verification/${c.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                    View
                  </Link>
                )}
                emptyMessage="No verification campaigns yet."
              />
            </div>
          </>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
