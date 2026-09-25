'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, Department, DisplaySettingsRecord, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

export default function DepartmentsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: departments, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<Department>('/departments', pageSize);
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Departments within each branch."
        action={
          <RequirePermission permission="departments.manage">
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New Department
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
        ) : departments.length === 0 ? (
          <EmptyState message="No departments yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Branch</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {departments.map((dept) => (
                <Tr key={dept.id}>
                  <Td className="font-medium text-slate-900">{dept.name}</Td>
                  <Td>{dept.code}</Td>
                  <Td>{branchNameById.get(dept.branchId) ?? '—'}</Td>
                  <Td>
                    <Badge tone={dept.isActive ? 'green' : 'neutral'}>{dept.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td>
                    <RequirePermission permission="departments.manage">
                      <button
                        onClick={() => {
                          setEditing(dept);
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

      <DepartmentFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        department={editing}
        branches={branches ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function DepartmentFormModal({
  open,
  department,
  branches,
  onClose,
  onSaved,
}: {
  open: boolean;
  department: Department | null;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [branchId, setBranchId] = useState(department?.branchId ?? branches[0]?.id ?? '');
  const [name, setName] = useState(department?.name ?? '');
  const [code, setCode] = useState(department?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: department ? 'Save changes to this department?' : 'Create this department?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      if (department) {
        await api.patch(`/departments/${department.id}`, { name, code });
      } else {
        await api.post('/departments', { branchId, name, code });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={department ? 'Edit Department' : 'New Department'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        {!department && (
          <Field>
            <Label htmlFor="branch" required>Branch</Label>
            <Select id="branch" required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="code" required>Code</Label>
          <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} />
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
