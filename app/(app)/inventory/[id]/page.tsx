'use client';

import { use, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { InventoryItem, IssuanceRecord, Paginated, StockBalance, UnitOfMeasure } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function InventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: item, loading, error, refetch } = useApi<InventoryItem>(`/inventory-items/${id}`);
  const { data: balances } = useApi<StockBalance[]>('/stock/balances', { itemId: id });
  const { data: unitsPage } = useApi<Paginated<UnitOfMeasure>>('/units-of-measure', { pageSize: 1000 });
  const units = unitsPage?.items;
  const { data: recentIssuances } = useApi<IssuanceRecord[]>('/issuance', { itemId: id, limit: 10 });
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading) return <PageLoading />;
  if (error || !item) return <ErrorAlert message={error ?? 'Item not found'} />;

  const totalOnHand = (balances ?? []).reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
  const availableUnits = (units ?? []).filter(
    (u) => u.id !== item.baseUnitId && !item.units?.some((iu) => iu.unitId === u.id),
  );

  return (
    <div>
      <PageHeader title={item.name} description={`Item code: ${item.itemCode}`} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>Details</CardHeader>
          <CardBody className="space-y-2 text-sm">
            <DetailRow label="Category" value={item.category?.name ?? '—'} />
            <DetailRow label="Base unit" value={item.baseUnit ? `${item.baseUnit.name} (${item.baseUnit.code})` : '—'} />
            <DetailRow label="Min stock level" value={`${item.minStockLevel} ${item.baseUnit?.code ?? ''}`} />
            <DetailRow label="Unit cost" value={item.unitCost ? `₦${Number(item.unitCost).toLocaleString()}` : '—'} />
            <DetailRow label="Preferred supplier" value={item.preferredSupplier ?? '—'} />
            <DetailRow label="Total on hand" value={`${totalOnHand} ${item.baseUnit?.code ?? ''}`} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <span>Unit conversions</span>
            <RequirePermission permission="inventoryItems.manage">
              <button onClick={() => setUnitModalOpen(true)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                + Add
              </button>
            </RequirePermission>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{item.baseUnit?.name} (base)</span>
              <span className="font-medium text-slate-900">1</span>
            </div>
            {item.units && item.units.length > 0 ? (
              item.units.map((u) => (
                <div key={u.id} className="flex justify-between">
                  <span className="text-slate-500">{u.unit?.name ?? u.unitId}</span>
                  <span className="font-medium text-slate-900">{u.conversionFactor}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400">No additional units configured.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Stock by location</CardHeader>
          {!balances || balances.length === 0 ? (
            <EmptyState message="No stock recorded yet." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Location</Th>
                  <Th>Quantity</Th>
                </Tr>
              </Thead>
              <Tbody>
                {balances.map((b) => (
                  <Tr key={b.id}>
                    <Td>{b.location?.name ?? '—'}</Td>
                    <Td className="font-medium text-slate-900">
                      {b.quantityOnHand} {item.baseUnit?.code}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex items-center justify-between">
          <span>Recent Issuances</span>
          <button onClick={() => setHistoryOpen(true)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            View Full History
          </button>
        </CardHeader>
        {!recentIssuances || recentIssuances.length === 0 ? (
          <EmptyState message="This item has never been issued." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Staff</Th>
                <Th>Quantity</Th>
                <Th>Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentIssuances.map((iss) => (
                <Tr key={iss.id}>
                  <Td className="font-medium text-slate-900">
                    {iss.requestedBy ? `${iss.requestedBy.firstName} ${iss.requestedBy.lastName}` : '—'}
                  </Td>
                  <Td>
                    {iss.quantityIssued} {iss.enteredUnit?.code ?? ''}
                  </Td>
                  <Td>{new Date(iss.issuedAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <UnitConversionModal
        open={unitModalOpen}
        itemId={id}
        units={availableUnits}
        onClose={() => setUnitModalOpen(false)}
        onSaved={() => {
          setUnitModalOpen(false);
          refetch();
        }}
      />

      <IssuanceHistoryModal open={historyOpen} itemId={id} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function IssuanceHistoryModal({ open, itemId, onClose }: { open: boolean; itemId: string; onClose: () => void }) {
  const { data: issuances, loading } = useApi<IssuanceRecord[]>(open ? '/issuance' : null, { itemId, limit: 200 });

  return (
    <Modal open={open} onClose={onClose} title="Full Issuance History">
      {loading ? (
        <PageLoading />
      ) : !issuances || issuances.length === 0 ? (
        <EmptyState message="This item has never been issued." />
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Staff</Th>
                <Th>Quantity</Th>
                <Th>Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {issuances.map((iss) => (
                <Tr key={iss.id}>
                  <Td className="font-medium text-slate-900">
                    {iss.requestedBy ? `${iss.requestedBy.firstName} ${iss.requestedBy.lastName}` : '—'}
                  </Td>
                  <Td>
                    {iss.quantityIssued} {iss.enteredUnit?.code ?? ''}
                  </Td>
                  <Td>{new Date(iss.issuedAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {issuances.length === 200 && (
            <p className="mt-2 text-xs text-slate-400">Showing the most recent 200 issuances.</p>
          )}
        </>
      )}
    </Modal>
  );
}

function UnitConversionModal({
  open,
  itemId,
  units,
  onClose,
  onSaved,
}: {
  open: boolean;
  itemId: string;
  units: UnitOfMeasure[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [unitId, setUnitId] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Add this unit conversion?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/inventory-items/${itemId}/units/${unitId}`, { conversionFactor: Number(conversionFactor) });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add unit conversion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Unit Conversion">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="unit" required>Unit</Label>
          <Select id="unit" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="factor" required>Conversion factor (base units per 1 of this unit)</Label>
          <Input
            id="factor"
            type="number"
            min="0.000001"
            step="0.000001"
            required
            value={conversionFactor}
            onChange={(e) => setConversionFactor(e.target.value)}
          />
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
