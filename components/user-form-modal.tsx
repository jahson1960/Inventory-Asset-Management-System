'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, CurrentUser, Department, LocationNode, Role } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export const ROLES: Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTODIAN', 'STAFF', 'AUDITOR', 'APPROVER', 'HOD'];

export interface UserRow extends CurrentUser {
  isActive: boolean;
  signatureUrl: string | null;
}

export interface CreateUserResult {
  email: string;
  emailSent: boolean;
  temporaryPassword?: string;
}

/** Shared by the Users list and a user's detail page — both let an admin edit the same account. */
export function UserFormModal({
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

export function RevealedPasswordModal({
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
