'use client';

import { useApi } from '@/hooks/use-api';
import type { AuditLogEntry } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { ExportMenu } from '@/components/ui/export-menu';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';

export default function AuditLogPage() {
  const { data, loading, error } = useApi<{ items: AuditLogEntry[]; total: number }>('/audit-logs', { limit: 200 });

  const exportColumns = [
    { header: 'Time', value: (e: AuditLogEntry) => new Date(e.createdAt).toLocaleString() },
    { header: 'Actor', value: (e: AuditLogEntry) => (e.actorUser ? `${e.actorUser.firstName} ${e.actorUser.lastName}` : 'System') },
    { header: 'Action', value: (e: AuditLogEntry) => e.action },
    { header: 'Entity', value: (e: AuditLogEntry) => `${e.entityType} #${e.entityId.slice(-6)}` },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of key system activity."
        action={<ExportMenu filename="audit-log" columns={exportColumns} rows={data?.items ?? []} />}
      />

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
          <>
            <div className="hidden md:block">
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
            </div>
            <div className="md:hidden">
              <MobileCardList
                rows={data.items}
                keyField={(entry) => entry.id}
                title={(entry) => entry.action}
                subtitle={(entry) => new Date(entry.createdAt).toLocaleString()}
                fields={[
                  { label: 'Actor', value: (entry) => (entry.actorUser ? `${entry.actorUser.firstName} ${entry.actorUser.lastName}` : 'System') },
                  { label: 'Entity', value: (entry) => `${entry.entityType} #${entry.entityId.slice(-6)}` },
                ]}
                emptyMessage="No audit activity recorded yet."
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
