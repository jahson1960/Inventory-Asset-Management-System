'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import type { DisplaySettingsRecord, VerificationCampaignRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
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

  return (
    <div>
      <PageHeader
        title="Verification Campaigns"
        description="Physical asset verification drives, tracked to completion."
        action={
          <RequirePermission permission="verification.manage">
            <Link href="/verification/new">
              <Button>New Campaign</Button>
            </Link>
          </RequirePermission>
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
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
