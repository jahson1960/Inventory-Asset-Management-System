'use client';

import { useAuth } from '@/contexts/auth-context';
import type { Department } from '@/lib/types';
import { Field, Input, Label, Select } from '@/components/ui/input';

/**
 * Requesters submit on behalf of their own department, not an arbitrary one — locked to
 * `user.departmentId` when the account has one. SUPER_ADMIN/BRANCH_ADMIN accounts can be
 * department-less, so they fall back to a normal editable select rather than being blocked.
 */
export function DepartmentField({
  departmentId,
  onChange,
  departments,
}: {
  departmentId: string;
  onChange: (id: string) => void;
  departments: Department[];
}) {
  const { user } = useAuth();

  if (user?.departmentId) {
    const name = departments.find((d) => d.id === user.departmentId)?.name ?? '—';
    return (
      <Field>
        <Label htmlFor="department">Department</Label>
        <Input id="department" value={name} disabled />
      </Field>
    );
  }

  return (
    <Field>
      <Label htmlFor="department" required>Department</Label>
      <Select id="department" required value={departmentId} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select department</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
