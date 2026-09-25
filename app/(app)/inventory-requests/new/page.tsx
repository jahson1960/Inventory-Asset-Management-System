'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import type { Department, InventoryItem, InventoryRequestRecord, LocationNode, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DepartmentField } from '@/components/department-field';

export default function NewInventoryRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: itemsPage } = useApi<Paginated<InventoryItem>>('/inventory-items', { pageSize: 1000 });
  const items = itemsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;

  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '');
  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantityRequested, setQuantityRequested] = useState('');
  const [unitId, setUnitId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const selectedItem = (items ?? []).find((i) => i.id === itemId);
  const unitOptions = selectedItem ? [selectedItem.baseUnit, ...(selectedItem.units ?? []).map((u) => u.unit)].filter(Boolean) : [];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Submit this request?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await api.post<InventoryRequestRecord>('/inventory-requests', {
        departmentId,
        itemId,
        locationId,
        quantityRequested: Number(quantityRequested),
        unitId,
        purpose: purpose || undefined,
      });
      router.push(`/inventory-requests/${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Inventory Request" description="Request consumable inventory for your department." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="item">Item</Label>
              <Select id="item" required value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select item</option>
                {(items ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.itemCode})
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="location">Issuing store</Label>
              <Select id="location" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select location</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>

            <DepartmentField departmentId={departmentId} onChange={setDepartmentId} departments={departments ?? []} />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={quantityRequested}
                  onChange={(e) => setQuantityRequested(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="unit">Unit</Label>
                <Select id="unit" required value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!itemId}>
                  <option value="">Select unit</option>
                  {unitOptions.map((u) => (
                    <option key={u!.id} value={u!.id}>
                      {u!.name} ({u!.code})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
