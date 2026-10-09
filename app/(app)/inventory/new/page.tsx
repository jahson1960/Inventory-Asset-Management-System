'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { QuickCreateCategoryModal } from '@/components/quick-create-category-modal';
import { QuickCreateLocationModal } from '@/components/quick-create-location-modal';
import { QuickCreateSupplierModal } from '@/components/quick-create-supplier-modal';
import { FormPageHeader, IconInput, Required, SectionHeader } from '@/components/ui/form-section';
import {
  BanknoteIcon,
  BarcodeIcon,
  BoxIcon,
  BuildingIcon,
  FileTextIcon,
  FolderIcon,
  SaveIcon,
  StoreIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from '@/components/icons/form-icons';

export default function NewInventoryItemPage() {
  return (
    <Suspense>
      <NewInventoryItemPageContent />
    </Suspense>
  );
}

function NewInventoryItemPageContent() {
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get('duplicateFrom');
  const { data: duplicateSource, loading: duplicateLoading } = useApi<InventoryItem>(
    duplicateFromId ? `/inventory-items/${duplicateFromId}` : null,
  );

  if (duplicateFromId && duplicateLoading) return <PageLoading />;

  return <NewInventoryItemForm duplicateSource={duplicateFromId ? (duplicateSource ?? null) : null} />;
}

function NewInventoryItemForm({ duplicateSource }: { duplicateSource: InventoryItem | null }) {
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

  // Item code and barcode are never copied — both are meant to uniquely identify one catalogue
  // entry / physical label, so carrying them over would just collide with the original.
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState(duplicateSource?.name ?? '');
  const [description, setDescription] = useState(duplicateSource?.description ?? '');
  const [categoryId, setCategoryId] = useState(duplicateSource?.categoryId ?? '');
  const [brand, setBrand] = useState(duplicateSource?.brand ?? '');
  const [baseUnitId, setBaseUnitId] = useState(duplicateSource?.baseUnitId ?? '');
  const [barcode, setBarcode] = useState('');
  const [preferredSupplier, setPreferredSupplier] = useState(duplicateSource?.preferredSupplier ?? '');
  const [unitCost, setUnitCost] = useState(duplicateSource?.unitCost ?? '');
  const [minStockLevel, setMinStockLevel] = useState(duplicateSource?.minStockLevel ?? '0');
  const [primaryStoreLocationId, setPrimaryStoreLocationId] = useState(duplicateSource?.primaryStoreLocationId ?? '');
  const [notes, setNotes] = useState(duplicateSource?.notes ?? '');
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
        notes: notes || undefined,
      });
      router.push(`/inventory/${item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <FormPageHeader
        icon={<BoxIcon className="h-7 w-7" />}
        title={duplicateSource ? 'Duplicate Inventory Item' : 'New Inventory Item'}
        description={
          duplicateSource
            ? `Copied from ${duplicateSource.itemCode}. Set a new item code (and barcode, if used), adjust anything else, then save.`
            : 'Add an item to the consumable inventory catalogue.'
        }
        breadcrumb={[{ label: 'Inventory', href: '/inventory' }, { label: duplicateSource ? 'Duplicate Item' : 'New Item' }]}
      />

      {error && <ErrorAlert message={error} />}

      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardBody>
            <SectionHeader number={1} title="Item Information" description="Provide the basic details of the inventory item." />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="itemCode">
                  Item code / SKU <Required />
                </Label>
                <IconInput icon={<BarcodeIcon className="h-4 w-4" />}>
                  <Input
                    id="itemCode"
                    required
                    placeholder="e.g. FA-00123"
                    className="pl-9"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                  />
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="barcode">Barcode</Label>
                <IconInput icon={<BarcodeIcon className="h-4 w-4" />}>
                  <Input
                    id="barcode"
                    placeholder="Scan or enter barcode"
                    className="pl-9"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </IconInput>
              </Field>
            </div>

            <Field>
              <Label htmlFor="name">
                Name <Required />
              </Label>
              <IconInput icon={<TagIcon className="h-4 w-4" />}>
                <Input
                  id="name"
                  required
                  placeholder="Enter item name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </IconInput>
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <IconInput icon={<FileTextIcon className="h-4 w-4" />} align="top">
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Enter item description…"
                  className="pl-9"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </IconInput>
            </Field>

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="category">
                  Category <Required />
                </Label>
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
              <IconInput icon={<FolderIcon className="h-4 w-4" />}>
                <Select id="category" required className="pl-9" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Select category</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="baseUnit">
                  Base unit <Required />
                </Label>
                <IconInput icon={<BoxIcon className="h-4 w-4" />}>
                  <Select id="baseUnit" required className="pl-9" value={baseUnitId} onChange={(e) => setBaseUnitId(e.target.value)}>
                    <option value="">Select unit</option>
                    {(units ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </Select>
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="brand">Brand</Label>
                <IconInput icon={<BuildingIcon className="h-4 w-4" />}>
                  <Input
                    id="brand"
                    placeholder="Enter brand"
                    className="pl-9"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </IconInput>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionHeader
              number={2}
              title="Stock & Supplier Details"
              description="Set the stock level and supplier information for this item."
            />

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="primaryStore">Primary store</Label>
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
              <IconInput icon={<StoreIcon className="h-4 w-4" />}>
                <Select
                  id="primaryStore"
                  className="pl-9"
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
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="unitCost">Unit cost</Label>
                <IconInput icon={<BanknoteIcon className="h-4 w-4" />}>
                  <Input
                    id="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter unit cost"
                    className="pl-9"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                  />
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="minStockLevel">Min / reorder level</Label>
                <IconInput icon={<BoxIcon className="h-4 w-4" />}>
                  <Input
                    id="minStockLevel"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Enter minimum level"
                    className="pl-9"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                  />
                </IconInput>
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
              <IconInput icon={<UserIcon className="h-4 w-4" />}>
                <Select id="preferredSupplier" className="pl-9" value={preferredSupplier} onChange={(e) => setPreferredSupplier(e.target.value)}>
                  <option value="">Select supplier</option>
                  {(suppliers ?? [])
                    .filter((s) => s.isActive || s.name === preferredSupplier)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </IconInput>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionHeader number={3} title="Additional Information" description="Add any extra notes or details about the item." />

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <IconInput icon={<FileTextIcon className="h-4 w-4" />} align="top">
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Any additional notes…"
                  className="pl-9"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </IconInput>
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={() => router.push('/inventory')}>
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <SaveIcon className="h-4 w-4" />
                {submitting ? 'Saving…' : duplicateSource ? 'Create Duplicate' : 'Create Item'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

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
