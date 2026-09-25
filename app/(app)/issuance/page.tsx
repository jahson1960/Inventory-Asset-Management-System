'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import type { InventoryIssuance } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';

export default function IssuancePage() {
  const { data: issuances, loading, error } = useApi<InventoryIssuance[]>('/issuance');

  return (
    <div>
      <PageHeader
        title="Inventory Issuance"
        description="Consumable inventory issued to staff and departments."
        action={
          <RequirePermission permission="issuance.create">
            <Link href="/issuance/new">
              <Button>New Issuance</Button>
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
        ) : !issuances || issuances.length === 0 ? (
          <EmptyState message="No issuance records yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Item</Th>
                <Th>Quantity</Th>
                <Th>Recipient</Th>
                <Th>Department</Th>
                <Th>Acknowledged</Th>
              </Tr>
            </Thead>
            <Tbody>
              {issuances.map((i) => (
                <Tr key={i.id}>
                  <Td>{new Date(i.issuedAt).toLocaleDateString()}</Td>
                  <Td className="font-medium text-slate-900">{i.item?.name ?? i.itemId}</Td>
                  <Td>
                    {i.quantityIssued} {i.enteredUnit?.code}
                  </Td>
                  <Td>{i.requestedBy ? `${i.requestedBy.firstName} ${i.requestedBy.lastName}` : '—'}</Td>
                  <Td>{i.department?.name ?? '—'}</Td>
                  <Td>
                    <Badge tone={i.recipientAcknowledged ? 'green' : 'amber'}>
                      {i.recipientAcknowledged ? 'Yes' : 'Pending'}
                    </Badge>
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
