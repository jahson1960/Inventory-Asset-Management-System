'use client';

import { useApi } from '@/hooks/use-api';
import type { AuditLogEntry } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';

export default function AuditLogPage() {
  const { data, loading, error } = useApi<{ items: AuditLogEntry[]; total: number }>('/audit-logs');

  return (
    <div>
      <PageHeader title="Audit Log" description="Immutable record of key system activity." />

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState message="No audit activity recorded yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.items.map((entry) => (
                <Tr key={entry.id}>
                  <Td>{new Date(entry.createdAt).toLocaleString()}</Td>
                  <Td>{entry.actorUser ? `${entry.actorUser.firstName} ${entry.actorUser.lastName}` : 'System'}</Td>
                  <Td className="font-mono text-xs">{entry.action}</Td>
                  <Td>
                    {entry.entityType} <span className="text-slate-400">#{entry.entityId.slice(-6)}</span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
