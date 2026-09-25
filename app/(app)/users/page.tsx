'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError, fileUrl, uploadFile } from '@/lib/api-client';
import type { Branch, CurrentUser, Department, DisplaySettingsRecord, Paginated, Role } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { Pagination } from '@/components/ui/pagination';

const ROLES: Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTODIAN', 'STAFF', 'AUDITOR', 'APPROVER', 'HOD'];

interface UserRow extends CurrentUser {
  isActive: boolean;
  signatureUrl: string | null;
}

export default function UsersPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: users, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<UserRow>('/users', pageSize);
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;
  const [modalOpen, setModalOpen] = useState(false);
  const [signatureUser, setSignatureUser] = useState<UserRow | null>(null);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const confirmAction = useConfirm();
  const signatureRequired = displaySettings?.signatureRequired ?? false;

  async function deactivate(id: string) {
    const ok = await confirmAction({
      title: 'Deactivate this user?',
      message: 'They will no longer be able to sign in.',
      tone: 'danger',
      confirmLabel: 'Deactivate',
    });
    if (!ok) return;
    await api.patch(`/users/${id}/deactivate`);
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Login accounts and role assignments."
        action={<Button onClick={() => setModalOpen(true)}>New User</Button>}
      />

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : !users || users.length === 0 ? (
          <EmptyState message="No users yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Branch</Th>
                <Th>Status</Th>
                <Th>Signature</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {users.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>
                    <Badge tone="blue">{u.role.replace('_', ' ')}</Badge>
                  </Td>
                  <Td>{u.branchId ? (branchNameById.get(u.branchId) ?? '—') : 'All branches'}</Td>
                  <Td>
                    <Badge tone={u.isActive ? 'green' : 'neutral'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setSignatureUser(u)}
                      className="flex items-center gap-2 text-xs font-medium text-gold-dark hover:underline"
                    >
                      {u.signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size
                        <img src={fileUrl(u.signatureUrl)} alt="Signature" className="h-6 max-w-16 object-contain" />
                      ) : (
                        <Badge tone={signatureRequired ? 'red' : 'neutral'}>No signature</Badge>
                      )}
                    </button>
                  </Td>
                  <Td>
                    {u.isActive && (
                      <button
                        onClick={() => deactivate(u.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Deactivate
                      </button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <UserFormModal
        open={modalOpen}
        branches={branches ?? []}
        departments={departments ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />

      <SignatureModal
        user={signatureUser}
        maxSizeKb={displaySettings?.maxSignatureSizeKb ?? 2048}
        onClose={() => setSignatureUser(null)}
        onSaved={refetch}
      />
    </div>
  );
}

function SignatureModal({
  user,
  maxSizeKb,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  maxSizeKb: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;
    if (file.size > maxSizeKb * 1024) {
      setError(`Signature must be ${maxSizeKb} KB or smaller`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadFile(`/users/${user.id}/signature`, file);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload signature');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await api.del(`/users/${user.id}/signature`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove signature');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(user)} onClose={onClose} title={user ? `${user.firstName} ${user.lastName}'s signature` : 'Signature'}>
      {error && <ErrorAlert message={error} />}
      {user?.signatureUrl && (
        <div className="mb-4 flex h-20 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size */}
          <img src={fileUrl(user.signatureUrl)} alt="Signature" className="max-h-16 max-w-full object-contain" />
        </div>
      )}
      <p className="mb-2 text-xs text-slate-400">Max {maxSizeKb} KB</p>
      <div className="flex items-center gap-2">
        <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Working…' : user?.signatureUrl ? 'Replace' : 'Upload'}
        </Button>
        {user?.signatureUrl && (
          <Button type="button" variant="secondary" disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>
    </Modal>
  );
}

function UserFormModal({
  open,
  branches,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean;
  branches: Branch[];
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('STAFF');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const deptOptions = departments.filter((d) => d.branchId === branchId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this user?', message: 'They will be able to sign in with the temporary password.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/users', {
        email,
        password,
        firstName,
        lastName,
        role,
        branchId: branchId || undefined,
        departmentId: departmentId || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New User">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="password">Temporary password</Label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="role">Role</Label>
          <Select id="role" required value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="branch">Branch (leave blank for organization-wide access)</Label>
          <Select
            id="branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setDepartmentId('');
            }}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        {branchId && (
          <Field>
            <Label htmlFor="department">Department (e.g. required for HOD)</Label>
            <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">No specific department</option>
              {deptOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
