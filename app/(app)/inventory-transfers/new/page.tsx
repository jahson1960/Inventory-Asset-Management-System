'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { InventoryItem, InventoryTransferRecord, LocationNode, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewInventoryTransferPage() {
  const router = useRouter();
  const { data: itemsPage } = useApi<Paginated<InventoryItem>>('/inventory-items', { pageSize: 1000 });
  const items = itemsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;

  const [itemId, setItemId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitId, setUnitId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const selectedItem = (items ?? []).find((i) => i.id === itemId);
  const unitOptions = selectedItem ? [selectedItem.baseUnit, ...(selectedItem.units ?? []).map((u) => u.unit)].filter(Boolean) : [];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Submit this transfer request?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const transfer = await api.post<InventoryTransferRecord>('/inventory-transfers', {
        itemId,
        fromLocationId,
        toLocationId,
        quantity: Number(quantity),
        unitId,
        reason: reason || undefined,
      });
      router.push(`/inventory-transfers/${transfer.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Inventory Transfer" description="Move stock from one store to another." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="item" required>Item</Label>
              <Select id="item" required value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select item</option>
                {(items ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.itemCode})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="from" required>From</Label>
                <Select id="from" required value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}>
                  <option value="">Select location</option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="to" required>To</Label>
                <Select id="to" required value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                  <option value="">Select location</option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="quantity" required>Quantity</Label>
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
                <Label htmlFor="unit" required>Unit</Label>
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
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Initiate Transfer'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
