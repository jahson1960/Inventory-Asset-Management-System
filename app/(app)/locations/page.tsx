'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, DisplaySettingsRecord, LocationNode, LocationType, Paginated } from '@/lib/types';
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

const LOCATION_TYPES: LocationType[] = ['BUILDING', 'FLOOR', 'ROOM', 'STORE'];

export default function LocationsPage() {
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: locations, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<LocationNode>('/locations', pageSize);
  const { data: allLocationsPage } = useApi<Paginated<LocationNode>>('/locations', { pageSize: 1000 });
  const allLocations = allLocationsPage?.items;
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationNode | null>(null);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const locationNameById = new Map((allLocations ?? []).map((l) => [l.id, l.name]));

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Branch → Building → Floor → Room → Store hierarchy."
        action={
          <RequirePermission permission="locations.manage">
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New Location
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
        ) : locations.length === 0 ? (
          <EmptyState message="No locations yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Branch</Th>
                <Th>Parent</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {locations.map((loc) => (
                <Tr key={loc.id}>
                  <Td className="font-medium text-slate-900">{loc.name}</Td>
                  <Td>
                    <Badge tone="blue">{loc.type}</Badge>
                  </Td>
                  <Td>{branchNameById.get(loc.branchId) ?? '—'}</Td>
                  <Td>{loc.parentId ? (locationNameById.get(loc.parentId) ?? '—') : '—'}</Td>
                  <Td>
                    <Badge tone={loc.isActive ? 'green' : 'neutral'}>{loc.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td>
                    <RequirePermission permission="locations.manage">
                      <button
                        onClick={() => {
                          setEditing(loc);
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

      <LocationFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        location={editing}
        branches={branches ?? []}
        allLocations={allLocations ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function LocationFormModal({
  open,
  location,
  branches,
  allLocations,
  onClose,
  onSaved,
}: {
  open: boolean;
  location: LocationNode | null;
  branches: Branch[];
  allLocations: LocationNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [branchId, setBranchId] = useState(location?.branchId ?? branches[0]?.id ?? '');
  const [parentId, setParentId] = useState(location?.parentId ?? '');
  const [type, setType] = useState<LocationType>(location?.type ?? 'ROOM');
  const [name, setName] = useState(location?.name ?? '');
  const [code, setCode] = useState(location?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const parentOptions = allLocations.filter((l) => l.branchId === branchId && l.id !== location?.id);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: location ? 'Save changes to this location?' : 'Create this location?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { parentId: parentId || undefined, type, name, code: code || undefined };
      if (location) {
        await api.patch(`/locations/${location.id}`, payload);
      } else {
        await api.post('/locations', { ...payload, branchId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={location ? 'Edit Location' : 'New Location'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        {!location && (
          <Field>
            <Label htmlFor="branch" required>Branch</Label>
            <Select
              id="branch"
              required
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setParentId('');
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field>
          <Label htmlFor="parent">Parent location</Label>
          <Select id="parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None (top level)</option>
            {parentOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="type" required>Type</Label>
          <Select id="type" required value={type} onChange={(e) => setType(e.target.value as LocationType)}>
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
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
