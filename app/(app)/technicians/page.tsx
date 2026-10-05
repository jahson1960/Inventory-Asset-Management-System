'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { DisplaySettingsRecord, Technician } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
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

export default function TechniciansPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: technicians, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<Technician>(
    '/technicians',
    pageSize,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(technician: Technician) {
    setEditing(technician);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Technicians"
        description="People assets can be sent to for repair or servicing."
        action={
          <RequirePermission permission="technicians.manage">
            <Button onClick={openCreate}>New Technician</Button>
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
        ) : !technicians || technicians.length === 0 ? (
          <EmptyState message="No technicians yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {technicians.map((technician) => (
                <Tr key={technician.id}>
                  <Td className="font-medium text-slate-900">{technician.name}</Td>
                  <Td>{technician.phone ?? '—'}</Td>
                  <Td>{technician.email ?? '—'}</Td>
                  <Td>
                    <Badge tone={technician.isActive ? 'green' : 'neutral'}>
                      {technician.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <RequirePermission permission="technicians.manage">
                      <button
                        onClick={() => openEdit(technician)}
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
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <TechnicianFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        technician={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function TechnicianFormModal({
  open,
  technician,
  onClose,
  onSaved,
}: {
  open: boolean;
  technician: Technician | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(technician?.name ?? '');
  const [phone, setPhone] = useState(technician?.phone ?? '');
  const [email, setEmail] = useState(technician?.email ?? '');
  const [isActive, setIsActive] = useState(technician?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: technician ? 'Save changes to this technician?' : 'Create this technician?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        phone: phone || undefined,
        email: email || undefined,
      };
      if (technician) {
        await api.patch(`/technicians/${technician.id}`, { ...payload, isActive });
      } else {
        await api.post('/technicians', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save technician');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={technician ? 'Edit Technician' : 'New Technician'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
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
        {technician && (
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
