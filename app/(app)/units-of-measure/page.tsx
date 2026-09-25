'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { DisplaySettingsRecord, UnitOfMeasure } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

export default function UnitsOfMeasurePage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: units, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<UnitOfMeasure>('/units-of-measure', pageSize);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null);

  return (
    <div>
      <PageHeader
        title="Units of Measure"
        description="Base and operational units used for inventory transactions (e.g. Pieces, Carton, Pack)."
        action={
          <RequirePermission permission="unitsOfMeasure.manage">
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New Unit
            </Button>
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
        ) : !units || units.length === 0 ? (
          <EmptyState message="No units yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {units.map((unit) => (
                <Tr key={unit.id}>
                  <Td className="font-medium text-slate-900">{unit.code}</Td>
                  <Td>{unit.name}</Td>
                  <Td>
                    <RequirePermission permission="unitsOfMeasure.manage">
                      <button
                        onClick={() => {
                          setEditing(unit);
                          setModalOpen(true);
                        }}
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

      <UnitFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        unit={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function UnitFormModal({
  open,
  unit,
  onClose,
  onSaved,
}: {
  open: boolean;
  unit: UnitOfMeasure | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(unit?.code ?? '');
  const [name, setName] = useState(unit?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: unit ? 'Save changes to this unit?' : 'Create this unit?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      if (unit) {
        await api.patch(`/units-of-measure/${unit.id}`, { code, name });
      } else {
        await api.post('/units-of-measure', { code, name });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save unit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={unit ? 'Edit Unit' : 'New Unit'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="code">Code</Label>
          <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
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
