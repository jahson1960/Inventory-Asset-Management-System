'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type {
  AdjustmentMovementType,
  InventoryItem,
  LocationNode,
  Paginated,
  StockMovement,
  StockMovementType,
  UnitOfMeasure,
} from '@/lib/types';
import { cn } from '@/lib/cn';
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

const MOVEMENT_TONE: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'neutral'> = {
  RECEIPT: 'green',
  OPENING_BALANCE: 'blue',
  ISSUE: 'red',
  ADJUSTMENT_IN: 'green',
  ADJUSTMENT_OUT: 'amber',
  DAMAGE: 'red',
  TRANSFER_IN: 'blue',
  TRANSFER_OUT: 'blue',
};

const MOVEMENT_TABS: { label: string; value: StockMovementType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Receipt', value: 'RECEIPT' },
  { label: 'Issue', value: 'ISSUE' },
  { label: 'Adjustment In', value: 'ADJUSTMENT_IN' },
  { label: 'Adjustment Out', value: 'ADJUSTMENT_OUT' },
  { label: 'Damage', value: 'DAMAGE' },
  { label: 'Transfer In', value: 'TRANSFER_IN' },
  { label: 'Transfer Out', value: 'TRANSFER_OUT' },
];

export default function StockMovementsPage() {
  const [movementType, setMovementType] = useState<StockMovementType | undefined>(undefined);
  const { data, loading, error, refetch } = useApi<{ items: StockMovement[]; total: number }>('/stock/movements', {
    movementType,
  });
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Complete ledger of receipts, issues and adjustments."
        action={
          <RequirePermission permission="stock.manage">
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
              Record Adjustment
            </Button>
          </RequirePermission>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {MOVEMENT_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setMovementType(tab.value)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              movementType === tab.value ? 'bg-gold text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState message="No stock movements recorded yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Item</Th>
                <Th>Location</Th>
                <Th>Type</Th>
                <Th>Quantity</Th>
                <Th>By</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.items.map((m) => (
                <Tr key={m.id}>
                  <Td>{new Date(m.occurredAt).toLocaleString()}</Td>
                  <Td className="font-medium text-slate-900">{m.item?.name ?? m.itemId}</Td>
                  <Td>{m.location?.name ?? '—'}</Td>
                  <Td>
                    <Badge tone={MOVEMENT_TONE[m.movementType] ?? 'neutral'}>{m.movementType.replace('_', ' ')}</Badge>
                  </Td>
                  <Td>
                    {m.enteredQuantity} {m.enteredUnit?.code}
                  </Td>
                  <Td>{m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <AdjustStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onSaved={() => {
          setAdjustOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function AdjustStockModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { data: itemsPage } = useApi<Paginated<InventoryItem>>(open ? '/inventory-items' : null, { pageSize: 1000 });
  const items = itemsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>(open ? '/locations' : null, { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;
  const { data: unitsPage } = useApi<Paginated<UnitOfMeasure>>(open ? '/units-of-measure' : null, { pageSize: 1000 });
  const units = unitsPage?.items;

  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [movementType, setMovementType] = useState<AdjustmentMovementType>('ADJUSTMENT_OUT');
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
    const ok = await confirm({ title: 'Record this stock adjustment?', tone: 'danger' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/stock/adjustments', {
        itemId,
        locationId,
        movementType,
        quantity: Number(quantity),
        unitId,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record adjustment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Stock Adjustment">
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
          <Label htmlFor="location">Location</Label>
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
          <Label htmlFor="movementType">Adjustment type</Label>
          <Select
            id="movementType"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as AdjustmentMovementType)}
          >
            <option value="ADJUSTMENT_IN">Adjustment (increase)</option>
            <option value="ADJUSTMENT_OUT">Adjustment (decrease)</option>
            <option value="DAMAGE">Damaged stock</option>
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
          <Label htmlFor="notes">Reason / notes</Label>
          <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record Adjustment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
