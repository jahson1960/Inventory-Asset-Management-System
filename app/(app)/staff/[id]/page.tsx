'use client';

import { use } from 'react';
import { useApi } from '@/hooks/use-api';
import type { AssetAssignment, Staff } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/spinner';
import { ErrorAlert } from '@/components/ui/alert';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: staff, loading, error } = useApi<Staff>(`/staff/${id}`);
  const { data: assignments, loading: assignmentsLoading } = useApi<AssetAssignment[]>(`/staff/${id}/assignments`);

  if (loading) return <PageLoading />;
  if (error || !staff) return <ErrorAlert message={error ?? 'Staff record not found'} />;

  return (
    <div>
      <PageHeader title={`${staff.firstName} ${staff.lastName}`} description={staff.staffNumber} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>Details</CardHeader>
          <CardBody className="space-y-2 text-sm">
            <DetailRow label="Job title" value={staff.jobTitle ?? '—'} />
            <DetailRow label="Email" value={staff.email ?? '—'} />
            <DetailRow label="Phone" value={staff.phone ?? '—'} />
            <DetailRow label="Status">
              <Badge tone={staff.isActive ? 'green' : 'neutral'}>{staff.isActive ? 'Active' : 'Inactive'}</Badge>
            </DetailRow>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>Asset assignment history</CardHeader>
          {assignmentsLoading ? (
            <PageLoading />
          ) : !assignments || assignments.length === 0 ? (
            <EmptyState message="No assets have been assigned to this staff member." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Asset</Th>
                  <Th>Assigned</Th>
                  <Th>Returned</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {assignments.map((a) => (
                  <Tr key={a.id}>
                    <Td className="font-medium text-slate-900">{a.asset?.name ?? a.assetId}</Td>
                    <Td>{new Date(a.assignedAt).toLocaleDateString()}</Td>
                    <Td>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      {children ?? <span className="font-medium text-slate-900">{value}</span>}
    </div>
  );
}
