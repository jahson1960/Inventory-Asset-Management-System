'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import type { InventoryIssuance } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { ExportMenu } from '@/components/ui/export-menu';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDepartmentOptions, useUserOptions, useInventoryCategoryOptions } from '@/hooks/use-filter-options';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';

export default function IssuancePage() {
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [requestedById, setRequestedById] = useState('');
  const categoryOptions = useInventoryCategoryOptions();
  const departmentOptions = useDepartmentOptions();
  const userOptions = useUserOptions();
  const { data: issuances, loading, error } = useApi<InventoryIssuance[]>('/issuance', {
    categoryId: categoryId || undefined,
    departmentId: departmentId || undefined,
    requestedById: requestedById || undefined,
  });

  const exportColumns = [
    { header: 'Date', value: (i: InventoryIssuance) => new Date(i.issuedAt).toLocaleDateString() },
    { header: 'Item', value: (i: InventoryIssuance) => i.item?.name ?? i.itemId },
    { header: 'Quantity', value: (i: InventoryIssuance) => `${i.quantityIssued} ${i.enteredUnit?.code ?? ''}`.trim() },
    { header: 'Recipient', value: (i: InventoryIssuance) => (i.requestedBy ? `${i.requestedBy.firstName} ${i.requestedBy.lastName}` : '') },
    { header: 'Department', value: (i: InventoryIssuance) => i.department?.name ?? '' },
    { header: 'Acknowledged', value: (i: InventoryIssuance) => (i.recipientAcknowledged ? 'Yes' : 'Pending') },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory Issuance"
        description="Consumable inventory issued to staff and departments."
        action={
          <div className="flex items-center gap-2">
            <ExportMenu filename="inventory-issuance" columns={exportColumns} rows={issuances ?? []} />
            <RequirePermission permission="issuance.create">
              <Link href="/issuance/new">
                <Button>New Issuance</Button>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <SearchableSelect
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          placeholder="All categories"
          searchPlaceholder="Search categories…"
        />
        <SearchableSelect
          value={departmentId}
          onChange={setDepartmentId}
          options={departmentOptions}
          placeholder="All departments"
          searchPlaceholder="Search departments…"
        />
        <SearchableSelect
          value={requestedById}
          onChange={setRequestedById}
          options={userOptions}
          placeholder="All recipients"
          searchPlaceholder="Search people…"
        />
      </div>

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
          <>
            <div className="hidden md:block">
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
            </div>
            <div className="md:hidden">
              <MobileCardList
                rows={issuances}
                keyField={(i) => i.id}
                title={(i) => i.item?.name ?? i.itemId}
                subtitle={(i) => new Date(i.issuedAt).toLocaleDateString()}
                badge={(i) => <Badge tone={i.recipientAcknowledged ? 'green' : 'amber'}>{i.recipientAcknowledged ? 'Yes' : 'Pending'}</Badge>}
                fields={[
                  { label: 'Quantity', value: (i) => `${i.quantityIssued} ${i.enteredUnit?.code ?? ''}`.trim() },
                  { label: 'Recipient', value: (i) => (i.requestedBy ? `${i.requestedBy.firstName} ${i.requestedBy.lastName}` : '—') },
                  { label: 'Department', value: (i) => i.department?.name ?? '—' },
                ]}
                emptyMessage="No issuance records yet."
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
