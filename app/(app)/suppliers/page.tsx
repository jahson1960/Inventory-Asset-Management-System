'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { DisplaySettingsRecord, Supplier } from '@/lib/types';
import { fetchAllForExport } from '@/lib/export-table';
import { PageHeader } from '@/components/ui/page-header';
import { ExportMenu } from '@/components/ui/export-menu';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

export default function SuppliersPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: suppliers, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<Supplier>(
    '/suppliers',
    pageSize,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setModalOpen(true);
  }

  const exportColumns = [
    { header: 'Name', value: (s: Supplier) => s.name },
    { header: 'Contact person', value: (s: Supplier) => s.contactPerson ?? '' },
    { header: 'Phone', value: (s: Supplier) => s.phone ?? '' },
    { header: 'Email', value: (s: Supplier) => s.email ?? '' },
    { header: 'Status', value: (s: Supplier) => (s.isActive ? 'Active' : 'Inactive') },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors assets and inventory can be sourced from."
        action={
          <div className="flex items-center gap-2">
            <ExportMenu filename="suppliers" columns={exportColumns} fetchRows={() => fetchAllForExport<Supplier>('/suppliers')} />
            <RequirePermission permission="suppliers.manage">
              <Button onClick={openCreate}>New Supplier</Button>
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
        ) : !suppliers || suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Contact person</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>Status</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {suppliers.map((supplier) => (
                    <Tr key={supplier.id}>
                      <Td className="font-medium text-slate-900">{supplier.name}</Td>
                      <Td>{supplier.contactPerson ?? '—'}</Td>
                      <Td>{supplier.phone ?? '—'}</Td>
                      <Td>{supplier.email ?? '—'}</Td>
                      <Td>
                        <Badge tone={supplier.isActive ? 'green' : 'neutral'}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td>
                        <RequirePermission permission="suppliers.manage">
                          <button
                            onClick={() => openEdit(supplier)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            Edit
                          </button>
                        </RequirePermission>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            <div className="md:hidden">
              <MobileCardList
                rows={suppliers}
                keyField={(s) => s.id}
                title={(s) => s.name}
                subtitle={(s) => s.contactPerson ?? null}
                badge={(s) => <Badge tone={s.isActive ? 'green' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>}
                fields={[
                  { label: 'Phone', value: (s) => s.phone ?? '—' },
                  { label: 'Email', value: (s) => s.email ?? '—' },
                ]}
                actions={(s) => (
                  <RequirePermission permission="suppliers.manage">
                    <button onClick={() => openEdit(s)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                      Edit
                    </button>
                  </RequirePermission>
                )}
                emptyMessage="No suppliers yet."
              />
            </div>
          </>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <SupplierFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        supplier={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function SupplierFormModal({
  open,
  supplier,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: supplier ? 'Save changes to this supplier?' : 'Create this supplier?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
      };
      if (supplier) {
        await api.patch(`/suppliers/${supplier.id}`, { ...payload, isActive });
      } else {
        await api.post('/suppliers', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={supplier ? 'Edit Supplier' : 'New Supplier'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="contactPerson">Contact person</Label>
          <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        {supplier && (
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
