'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { usePermissions } from '@/hooks/use-permissions';
import { api, ApiError } from '@/lib/api-client';
import type {
  DisplaySettingsRecord,
  InventoryCategory,
  InventoryItem,
  LocationNode,
  Paginated,
  Supplier,
  UnitOfMeasure,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { QuickCreateCategoryModal } from '@/components/quick-create-category-modal';
import { QuickCreateLocationModal } from '@/components/quick-create-location-modal';
import { QuickCreateSupplierModal } from '@/components/quick-create-supplier-modal';

export default function NewInventoryItemPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { data: categoriesPage, refetch: refetchCategories } = useApi<Paginated<InventoryCategory>>('/inventory-categories', {
    pageSize: 1000,
  });
  const categories = categoriesPage?.items;
  const { data: unitsPage } = useApi<Paginated<UnitOfMeasure>>('/units-of-measure', { pageSize: 1000 });
  const units = unitsPage?.items;
  const { data: locationsPage, refetch: refetchLocations } = useApi<Paginated<LocationNode>>('/locations', {
    type: 'STORE',
    pageSize: 1000,
  });
  const locations = locationsPage?.items;
  const { data: suppliersPage, refetch: refetchSuppliers } = useApi<Paginated<Supplier>>('/suppliers', { pageSize: 1000 });
  const suppliers = suppliersPage?.items;
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const inlineCreateEnabled = displaySettings?.inlineCreateEnabled ?? true;
  const canQuickCreateCategory = inlineCreateEnabled && can('inventoryCategories.manage');
  const canQuickCreateLocation = inlineCreateEnabled && can('locations.manage');
  const canQuickCreateSupplier = inlineCreateEnabled && can('suppliers.manage');
  const [quickCreateOpen, setQuickCreateOpen] = useState<'category' | 'location' | 'supplier' | null>(null);

  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [preferredSupplier, setPreferredSupplier] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('0');
  const [primaryStoreLocationId, setPrimaryStoreLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this item?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const item = await api.post<InventoryItem>('/inventory-items', {
        itemCode,
        name,
        description: description || undefined,
        categoryId,
        brand: brand || undefined,
        baseUnitId,
        barcode: barcode || undefined,
        preferredSupplier: preferredSupplier || undefined,
        unitCost: unitCost ? Number(unitCost) : undefined,
        minStockLevel: Number(minStockLevel),
        primaryStoreLocationId: primaryStoreLocationId || undefined,
      });
      router.push(`/inventory/${item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Inventory Item" description="Add an item to the consumable inventory catalogue." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="itemCode">Item code / SKU</Label>
                <Input id="itemCode" required value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
              </Field>
              <Field>
                <Label htmlFor="barcode">Barcode (optional)</Label>
                <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
              </Field>
            </div>

            <Field>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="category">Category</Label>
                {canQuickCreateCategory && (
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen('category')}
                    className="text-xs font-medium text-gold-dark hover:underline"
                  >
                    + New category
                  </button>
                )}
              </div>
              <Select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="baseUnit">Base unit</Label>
                <Select id="baseUnit" required value={baseUnitId} onChange={(e) => setBaseUnitId(e.target.value)}>
                  <option value="">Select unit</option>
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </Field>
            </div>

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="primaryStore">Primary store (optional)</Label>
                {canQuickCreateLocation && (
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen('location')}
                    className="text-xs font-medium text-gold-dark hover:underline"
                  >
                    + New store
                  </button>
                )}
              </div>
              <Select
                id="primaryStore"
                value={primaryStoreLocationId}
                onChange={(e) => setPrimaryStoreLocationId(e.target.value)}
              >
                <option value="">None</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="unitCost">Unit cost</Label>
                <Input id="unitCost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </Field>
              <Field>
                <Label htmlFor="minStockLevel">Min / reorder level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  step="0.001"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="preferredSupplier">Preferred supplier</Label>
                {canQuickCreateSupplier && (
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen('supplier')}
                    className="text-xs font-medium text-gold-dark hover:underline"
                  >
                    + New supplier
                  </button>
                )}
              </div>
              <Select id="preferredSupplier" value={preferredSupplier} onChange={(e) => setPreferredSupplier(e.target.value)}>
                <option value="">Select supplier</option>
                {(suppliers ?? [])
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Create Item'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <QuickCreateCategoryModal
        kind="inventory"
        open={quickCreateOpen === 'category'}
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(category) => {
          refetchCategories();
          setCategoryId(category.id);
        }}
      />
      <QuickCreateLocationModal
        open={quickCreateOpen === 'location'}
        defaultType="STORE"
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(location) => {
          refetchLocations();
          setPrimaryStoreLocationId(location.id);
        }}
      />
      <QuickCreateSupplierModal
        open={quickCreateOpen === 'supplier'}
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(newSupplier) => {
          refetchSuppliers();
          setPreferredSupplier(newSupplier.name);
        }}
      />
    </div>
  );
}
