'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError, fileUrl, uploadFile } from '@/lib/api-client';
import type { Branch, CurrentUser, Department, DisplaySettingsRecord, LocationNode, Paginated, Role } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
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
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { pageSize: 1000 });
  const locations = locationsPage?.items;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [signatureUser, setSignatureUser] = useState<UserRow | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<{ email: string; password: string } | null>(null);

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

  async function activate(id: string) {
    const ok = await confirmAction({ title: 'Activate this user?', message: 'They will be able to sign in again.' });
    if (!ok) return;
    await api.patch(`/users/${id}/activate`);
    refetch();
  }

  async function resetPassword(u: UserRow) {
    const ok = await confirmAction({
      title: `Reset ${u.firstName} ${u.lastName}'s password?`,
      message: 'A new random temporary password will be emailed to them; they must change it on next login.',
    });
    if (!ok) return;
    const result = await api.patch<{ emailSent: boolean; temporaryPassword?: string }>(`/users/${u.id}/reset-password`);
    if (!result.emailSent && result.temporaryPassword) {
      setRevealedPassword({ email: u.email, password: result.temporaryPassword });
    }
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
                <Th>Staff No.</Th>
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
                  <Td>{u.staffNumber ?? '—'}</Td>
                  <Td>
                    <div className="font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </div>
                    {u.jobTitle && <div className="text-xs text-slate-500">{u.jobTitle}</div>}
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Reset password
                      </button>
                      {u.isActive ? (
                        <button
                          onClick={() => deactivate(u.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activate(u.id)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <UserFormModal
        key={editingUser?.id ?? 'new'}
        open={modalOpen || Boolean(editingUser)}
        user={editingUser}
        branches={branches ?? []}
        departments={departments ?? []}
        locations={locations ?? []}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSaved={(result) => {
          setModalOpen(false);
          setEditingUser(null);
          if (result && !result.emailSent && result.temporaryPassword) {
            setRevealedPassword({ email: result.email, password: result.temporaryPassword });
          }
          refetch();
        }}
      />

      <RevealedPasswordModal info={revealedPassword} onClose={() => setRevealedPassword(null)} />

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

interface CreateUserResult {
  email: string;
  emailSent: boolean;
  temporaryPassword?: string;
}

function RevealedPasswordModal({
  info,
  onClose,
}: {
  info: { email: string; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal open={Boolean(info)} onClose={onClose} title="Couldn't email the temporary password">
      <p className="mb-3 text-sm text-slate-600">
        A new temporary password was set for <span className="font-medium text-slate-900">{info?.email}</span>, but
        the notification email could not be sent (check SMTP settings). Share this temporary password with them
        directly — it will not be shown again.
      </p>
      <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900">
        {info?.password}
      </p>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

function UserFormModal({
  open,
  user,
  branches,
  departments,
  locations,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: UserRow | null;
  branches: Branch[];
  departments: Department[];
  locations: LocationNode[];
  onClose: () => void;
  onSaved: (result?: CreateUserResult) => void;
}) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'STAFF');
  const [branchId, setBranchId] = useState(user?.branchId ?? '');
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '');
  const [locationId, setLocationId] = useState(user?.locationId ?? '');
  const [staffNumber, setStaffNumber] = useState(user?.staffNumber ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const locationOptions = locations.filter((l) => l.branchId === branchId);
  // On create, branch/department/location are mandatory for every role, no exceptions. On edit,
  // the pre-existing, narrower rule still applies (required only for STAFF) so an admin can keep
  // editing a legacy account that predates this rule without being forced to backfill it.
  const isCreate = !user;
  const branchRequired = isCreate || role === 'STAFF';
  const departmentRequired = isCreate;
  const locationRequired = isCreate || role === 'STAFF';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm(
      user
        ? { title: 'Save changes to this user?' }
        : {
            title: 'Create this user?',
            message: 'A random temporary password will be emailed to them; they must change it on first login.',
          },
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      if (user) {
        // Unlike create (where a blank field just means "don't set it"), an edit can be clearing
        // a value that was previously set — sending undefined would omit the key entirely and
        // leave the old value untouched, so these use null instead to actually clear them.
        await api.patch(`/users/${user.id}`, {
          firstName,
          lastName,
          role,
          branchId: branchId || null,
          departmentId: departmentId || null,
          locationId: locationId || null,
          staffNumber: staffNumber || null,
          phone: phone || null,
          jobTitle: jobTitle || null,
        });
        onSaved();
      } else {
        const result = await api.post<CreateUserResult>('/users', {
          email,
          firstName,
          lastName,
          role,
          branchId: branchId || undefined,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
          staffNumber: staffNumber || undefined,
          phone: phone || undefined,
          jobTitle: jobTitle || undefined,
        });
        onSaved(result);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${user ? 'save' : 'create'} user`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit User' : 'New User'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="firstName" required>First name</Label>
            <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="lastName" required>Last name</Label>
            <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field>
          <Label htmlFor="email" required>Email</Label>
          <Input
            id="email"
            type="email"
            required
            disabled={Boolean(user)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {user && <p className="mt-1 text-xs text-slate-400">Email can&apos;t be changed after the account is created.</p>}
        </Field>
        <Field>
          <Label htmlFor="role" required>Role</Label>
          <Select id="role" required value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="branch" required={branchRequired}>
            Branch{branchRequired ? '' : ' (leave blank for organization-wide access)'}
          </Label>
          <Select
            id="branch"
            required={branchRequired}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setLocationId('');
            }}
          >
            <option value="">{branchRequired ? 'Select branch' : 'All branches'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="department" required={departmentRequired}>
            Department
          </Label>
          <Select id="department" required={departmentRequired} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">{departmentRequired ? 'Select department' : 'No specific department'}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        {branchId && (
          <Field>
            <Label htmlFor="location" required={locationRequired}>
              Location{locationRequired ? '' : ' (where this person is based)'}
            </Label>
            <Select id="location" required={locationRequired} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">{locationRequired ? 'Select location' : 'No specific location'}</option>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">Assets assigned to this person will move to this location.</p>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="staffNumber">Staff number</Label>
            <Input id="staffNumber" value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field>
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : user ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
