'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, Department, DisplaySettingsRecord, Paginated, Staff } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { ExpandableList } from '@/components/ui/expandable-list';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useListViewMode } from '@/hooks/use-list-view-mode';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Pagination } from '@/components/ui/pagination';

export default function StaffPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: staff, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<Staff>('/staff', pageSize);
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;
  const adminDefault = displaySettings?.cardViewLists.includes('staff') ? 'CARD' : 'TABLE';
  const [mode, setMode] = useListViewMode('staff', adminDefault);
  const [modalOpen, setModalOpen] = useState(false);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const deptNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Staff records that assets can be assigned to and inventory issued to."
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={mode} onChange={setMode} />
            <RequirePermission permission="staff.manage">
              <Button onClick={() => setModalOpen(true)}>New Staff</Button>
            </RequirePermission>
          </div>
        }
      />

      {loading ? (
        <PageLoading />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <ExpandableList<Staff>
          items={staff}
          mode={mode}
          getRowKey={(s) => s.id}
          emptyMessage="No staff records yet."
          viewFullHref={(s) => `/staff/${s.id}`}
          columns={[
            { header: 'Staff No.', render: (s) => s.staffNumber },
            {
              header: 'Name',
              render: (s) => (
                <span className="font-medium text-slate-900">
                  {s.firstName} {s.lastName}
                </span>
              ),
            },
            { header: 'Branch', render: (s) => branchNameById.get(s.branchId) ?? '—' },
            { header: 'Department', render: (s) => deptNameById.get(s.departmentId) ?? '—' },
            {
              header: 'Status',
              render: (s) => <Badge tone={s.isActive ? 'green' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>,
            },
          ]}
          renderCard={(s) => (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{s.staffNumber}</p>
              <p className="font-medium text-slate-900">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-xs text-slate-500">{deptNameById.get(s.departmentId) ?? '—'}</p>
              <Badge tone={s.isActive ? 'green' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          )}
          renderExpanded={(s) => (
            <div className="space-y-1.5 text-sm">
              <ExpandedRow label="Branch" value={branchNameById.get(s.branchId) ?? '—'} />
              <ExpandedRow label="Department" value={deptNameById.get(s.departmentId) ?? '—'} />
              <ExpandedRow label="Job title" value={s.jobTitle ?? '—'} />
              <ExpandedRow label="Email" value={s.email ?? '—'} />
              <ExpandedRow label="Phone" value={s.phone ?? '—'} />
            </div>
          )}
        />
      )}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <StaffFormModal
        open={modalOpen}
        branches={branches ?? []}
        departments={departments ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function StaffFormModal({
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
  const [staffNumber, setStaffNumber] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [departmentId, setDepartmentId] = useState('');

  useEffect(() => {
    // Syncs the default branch selection once /branches resolves after this modal's first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!branchId && branches.length > 0) setBranchId(branches[0].id);
  }, [branches, branchId]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const deptOptions = departments.filter((d) => d.branchId === branchId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this staff record?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/staff', {
        staffNumber,
        branchId,
        departmentId,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        jobTitle: jobTitle || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save staff record');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Staff">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="staffNumber" required>Staff number</Label>
          <Input id="staffNumber" required value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} />
        </Field>
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
          <Label htmlFor="branch" required>Branch</Label>
          <Select
            id="branch"
            required
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setDepartmentId('');
            }}
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="department" required>Department</Label>
          <Select id="department" required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select department</option>
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
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

function ExpandedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
