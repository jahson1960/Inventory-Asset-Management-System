'use client';

import { use } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { fileUrl } from '@/lib/api-client';
import type { AssetAssignment, CurrentUser, InventoryIssuance } from '@/lib/types';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, MonitorIcon, BoxIcon } from '@/components/icons/form-icons';

interface UserDetail extends CurrentUser {
  isActive: boolean;
  signatureUrl: string | null;
  lastLoginAt: string | null;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, loading, error } = useApi<UserDetail>(`/users/${id}`);
  const {
    data: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
  } = useApi<AssetAssignment[]>(`/staff/${id}/assignments`);
  const {
    data: issuances,
    loading: issuancesLoading,
    error: issuancesError,
  } = useApi<InventoryIssuance[]>('/issuance', { requestedById: id, limit: 100 });

  if (loading) return <PageLoading />;
  if (error || !user) return <ErrorAlert message={error ?? 'User not found'} />;

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/users" className="flex items-center hover:text-slate-700">
          <ChevronLeftIcon className="h-4 w-4" />
        </Link>
        <Link href="/users" className="hover:text-slate-700">
          Users
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">
          {user.firstName} {user.lastName}
        </span>
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
              {user.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size
                <img src={fileUrl(user.signatureUrl)} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <UserIcon className="h-7 w-7" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">
                {user.firstName} {user.lastName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
              {user.jobTitle && <p className="text-xs text-slate-400">{user.jobTitle}</p>}
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="blue">{user.role.replace('_', ' ')}</Badge>
                <Badge tone={user.isActive ? 'green' : 'neutral'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <DetailRow label="Staff No." value={user.staffNumber ?? '—'} />
            <DetailRow label="Branch" value={user.branch?.name ?? 'All branches'} />
            <DetailRow label="Department" value={user.department?.name ?? '—'} />
            <DetailRow label="Location" value={user.location?.name ?? '—'} />
            <DetailRow label="Phone" value={user.phone ?? '—'} />
          </dl>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader className="flex items-center gap-2">
          <MonitorIcon className="h-4 w-4 text-slate-400" />
          Asset Assignment History
        </CardHeader>
        {assignmentsLoading ? (
          <PageLoading />
        ) : assignmentsError ? (
          <div className="p-4">
            <ErrorAlert message={assignmentsError} />
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState message="This person has never been assigned an asset." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Asset</Th>
                <Th>Assigned</Th>
                <Th>Returned</Th>
                <Th>Acknowledged</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {assignments.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <Link href={`/assets/${a.assetId}`} className="font-medium text-slate-900 hover:underline">
                      {a.asset?.name ?? a.assetId}
                    </Link>
                  </Td>
                  <Td>{new Date(a.assignedAt).toLocaleDateString()}</Td>
                  <Td>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '—'}</Td>
                  <Td>
                    <Badge tone={a.acknowledged ? 'green' : 'amber'}>{a.acknowledged ? 'Yes' : 'Pending'}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <BoxIcon className="h-4 w-4 text-slate-400" />
          Inventory Issuance History
        </CardHeader>
        {issuancesLoading ? (
          <PageLoading />
        ) : issuancesError ? (
          <div className="p-4">
            <ErrorAlert message={issuancesError} />
          </div>
        ) : !issuances || issuances.length === 0 ? (
          <EmptyState message="This person has never been issued an inventory item." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Item</Th>
                <Th>Qty Issued</Th>
                <Th>Location</Th>
                <Th>Issued</Th>
                <Th>Acknowledged</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {issuances.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-900">{i.item?.name ?? i.itemId}</Td>
                  <Td>
                    {i.quantityIssued} {i.enteredUnit?.code ?? ''}
                  </Td>
                  <Td>{i.location?.name ?? '—'}</Td>
                  <Td>{new Date(i.issuedAt).toLocaleDateString()}</Td>
                  <Td>
                    <Badge tone={i.recipientAcknowledged ? 'green' : 'amber'}>
                      {i.recipientAcknowledged ? 'Yes' : 'Pending'}
                    </Badge>
                  </Td>
                  <Td>{i.status}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </>
  );
}
