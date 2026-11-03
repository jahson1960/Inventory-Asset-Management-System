'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { AssetAssignment, LocationNode, Paginated } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Field, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';

/** Shared by the Assignments list and the Asset detail page — both call the same
 *  POST /assignments/:id/return endpoint, whether an admin is returning an ACTIVE assignment
 *  directly or confirming one a staff member put into RETURN_PENDING via "Request Return". Either
 *  way the asset needs a real new location, since wherever it sat before moved with whoever was
 *  holding it and is stale now that it's back. */
export function ReturnAssetModal({
  assignment,
  onClose,
  onReturned,
}: {
  assignment: AssetAssignment | null;
  onClose: () => void;
  onReturned: () => void;
}) {
  const branchId = assignment?.asset?.branchId;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>(branchId ? '/locations' : null, { pageSize: 1000 });
  const locations = (locationsPage?.items ?? []).filter((l) => l.branchId === branchId);
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isApproval = assignment?.status === 'RETURN_PENDING';
  const staffName = assignment?.staff ? `${assignment.staff.firstName} ${assignment.staff.lastName}` : 'the assignee';

  function handleClose() {
    setLocationId('');
    setError(null);
    onClose();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!assignment || !locationId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/assignments/${assignment.id}/return`, { newLocationId: locationId });
      onReturned();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to return asset');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={Boolean(assignment)} onClose={handleClose} title={isApproval ? 'Approve Return' : 'Return Asset'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <p className="mb-3 text-sm text-slate-600">
          {isApproval ? (
            <>
              Confirming the return of <span className="font-medium text-slate-900">{assignment?.asset?.name}</span> from{' '}
              <span className="font-medium text-slate-900">{staffName}</span>.
            </>
          ) : (
            <>
              Returning <span className="font-medium text-slate-900">{assignment?.asset?.name}</span> and marking it back in
              store.
            </>
          )}
        </p>
        <Field>
          <Label htmlFor="newLocation" required>
            Store location
          </Label>
          <Select id="newLocation" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Select where this asset will be stored</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !locationId}>
            {submitting ? 'Working…' : isApproval ? 'Confirm Return' : 'Return'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
