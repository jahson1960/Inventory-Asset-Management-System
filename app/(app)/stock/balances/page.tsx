'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { InventoryItem, LocationNode, Paginated, StockBalance, UnitOfMeasure } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function StockBalancesPage() {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: balances, loading, error, refetch } = useApi<StockBalance[]>('/stock/balances', {
    lowStock: lowStockOnly || undefined,
  });
  const [receiptOpen, setReceiptOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Stock Balances"
        description="Current quantity on hand by item and store location."
        action={
          <RequirePermission permission="stock.manage">
            <Button onClick={() => setReceiptOpen(true)}>Receive Stock</Button>
          </RequirePermission>
        }
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
        Show low-stock items only
      </label>

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : !balances || balances.length === 0 ? (
          <EmptyState message="No stock balances recorded yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Item</Th>
                <Th>Location</Th>
                <Th>Quantity</Th>
                <Th>Min level</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {balances.map((b) => {
                const low = Number(b.quantityOnHand) < Number(b.item?.minStockLevel ?? 0);
                return (
                  <Tr key={b.id}>
                    <Td className="font-medium text-slate-900">{b.item?.name ?? b.itemId}</Td>
                    <Td>{b.location?.name ?? '—'}</Td>
                    <Td>
                      {b.quantityOnHand} {b.item?.baseUnit?.code}
                    </Td>
                    <Td>
                      {b.item?.minStockLevel} {b.item?.baseUnit?.code}
                    </Td>
                    <Td>
                      <Badge tone={low ? 'red' : 'green'}>{low ? 'Low stock' : 'OK'}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      <ReceiveStockModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onSaved={() => {
          setReceiptOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function ReceiveStockModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: itemsPage } = useApi<Paginated<InventoryItem>>(open ? '/inventory-items' : null, { pageSize: 1000 });
  const items = itemsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>(open ? '/locations' : null, { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;
  const { data: unitsPage } = useApi<Paginated<UnitOfMeasure>>(open ? '/units-of-measure' : null, { pageSize: 1000 });
  const units = unitsPage?.items;

  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitId, setUnitId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const selectedItem = (items ?? []).find((i) => i.id === itemId);
  const unitOptions = selectedItem
    ? [selectedItem.baseUnit, ...(selectedItem.units ?? []).map((u) => u.unit)].filter(Boolean)
    : (units ?? []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Receive this stock?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/stock/receipts', {
        itemId,
        locationId,
        quantity: Number(quantity),
        unitId,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record receipt');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Receive Stock">
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
          <Label htmlFor="location">Store location</Label>
          <Select id="location" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Select location</option>
            {(locations ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
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
            <Select id="unit" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
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
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record Receipt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
