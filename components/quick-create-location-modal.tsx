'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, LocationNode, LocationType, Paginated } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

const LOCATION_TYPES: LocationType[] = ['BUILDING', 'FLOOR', 'ROOM', 'STORE'];

export function QuickCreateLocationModal({
  open,
  defaultType = 'ROOM',
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultType?: LocationType;
  onClose: () => void;
  onCreated: (location: LocationNode) => void;
}) {
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState<LocationType>(defaultType);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this location?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const location = await api.post<LocationNode>('/locations', { branchId, type, name });
      setName('');
      onCreated(location);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create location');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Location">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="quickLocationBranch" required>Branch</Label>
          <Select id="quickLocationBranch" required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Select branch</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="quickLocationType" required>Type</Label>
          <Select id="quickLocationType" required value={type} onChange={(e) => setType(e.target.value as LocationType)}>
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="quickLocationName" required>Name</Label>
          <Input id="quickLocationName" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <p className="mb-3 text-xs text-slate-500">Created as a top-level location; edit it later from Locations to set a parent.</p>
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
