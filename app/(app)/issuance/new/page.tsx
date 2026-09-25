'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Department, InventoryItem, LocationNode, Paginated, Staff } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewIssuancePage() {
  const router = useRouter();
  const { data: itemsPage } = useApi<Paginated<InventoryItem>>('/inventory-items', { pageSize: 1000 });
  const items = itemsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;
  const { data: staffPage } = useApi<Paginated<Staff>>('/staff', { pageSize: 1000 });
  const staff = staffPage?.items;
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;

  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [requestedById, setRequestedById] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitId, setUnitId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const selectedItem = (items ?? []).find((i) => i.id === itemId);
  const unitOptions = selectedItem ? [selectedItem.baseUnit, ...(selectedItem.units ?? []).map((u) => u.unit)].filter(Boolean) : [];

  function onStaffChange(id: string) {
    setRequestedById(id);
    const selected = (staff ?? []).find((s) => s.id === id);
    if (selected) setDepartmentId(selected.departmentId);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Issue this item?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/issuance', {
        itemId,
        locationId,
        requestedById,
        departmentId,
        quantity: Number(quantity),
        unitId,
        purpose: purpose || undefined,
      });
      router.push('/issuance');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record issuance');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Issuance" description="Issue consumable inventory to a staff member or department." />

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

            <Field>
              <Label htmlFor="staff">Recipient (staff)</Label>
              <Select id="staff" required value={requestedById} onChange={(e) => onStaffChange(e.target.value)}>
                <option value="">Select staff</option>
                {(staff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.staffNumber})
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="department">Department</Label>
              <Select id="department" required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select department</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
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
                {submitting ? 'Recording…' : 'Record Issuance'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
