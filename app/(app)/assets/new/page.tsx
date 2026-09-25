'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { api, ApiError } from '@/lib/api-client';
import type {
  Asset,
  AssetCategory,
  AssetCondition,
  AssetTrackingType,
  DepreciationMethod,
  DisplaySettingsRecord,
  LocationNode,
  Paginated,
  Supplier,
} from '@/lib/types';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
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
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  HeartIcon,
  LayersIcon,
  ListIcon,
  MapPinIcon,
  MonitorIcon,
  SaveIcon,
  ShieldIcon,
  SmartphoneIcon,
  TagIcon,
  TypeIcon,
  UserIcon,
  XIcon,
} from '@/components/icons/form-icons';

const TRACKING_TYPES: AssetTrackingType[] = ['FIXED_ASSET', 'CONTROLLED_EQUIPMENT'];
const CONDITIONS: AssetCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function NewAssetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { data: categoriesPage, refetch: refetchCategories } = useApi<Paginated<AssetCategory>>('/asset-categories', {
    pageSize: 1000,
  });
  const categories = categoriesPage?.items;
  const { data: locationsPage, refetch: refetchLocations } = useApi<Paginated<LocationNode>>('/locations', { pageSize: 1000 });
  const locations = locationsPage?.items;
  const { data: suppliersPage, refetch: refetchSuppliers } = useApi<Paginated<Supplier>>('/suppliers', { pageSize: 1000 });
  const suppliers = suppliersPage?.items;
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const canSeeCost = Boolean(user && displaySettings?.purchaseCostVisibleRoles.includes(user.role));
  const requiredFields = displaySettings?.assetRequiredFields ?? [];
  const inlineCreateEnabled = displaySettings?.inlineCreateEnabled ?? true;
  const canQuickCreateCategory = inlineCreateEnabled && can('assetCategories.manage');
  const canQuickCreateLocation = inlineCreateEnabled && can('locations.manage');
  const canQuickCreateSupplier = inlineCreateEnabled && can('suppliers.manage');
  const [quickCreateOpen, setQuickCreateOpen] = useState<'category' | 'location' | 'supplier' | null>(null);

  const [assetTag, setAssetTag] = useState('');
  const [trackingType, setTrackingType] = useState<AssetTrackingType>('FIXED_ASSET');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [warrantyProvider, setWarrantyProvider] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('NEW');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('');
  const [salvageValue, setSalvageValue] = useState('');
  const [depreciationMethod, setDepreciationMethod] = useState<'' | DepreciationMethod>('');
  const [depreciationRate, setDepreciationRate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this asset?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const asset = await api.post<Asset>('/assets', {
        assetTag,
        trackingType,
        categoryId,
        name,
        brand: brand || undefined,
        model: model || undefined,
        serialNumber: serialNumber || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
        supplier: supplier || undefined,
        warrantyStartDate: warrantyStartDate || undefined,
        warrantyEndDate: warrantyEndDate || undefined,
        warrantyProvider: warrantyProvider || undefined,
        condition,
        currentLocationId,
        usefulLifeMonths: usefulLifeMonths ? Number(usefulLifeMonths) : undefined,
        salvageValue: salvageValue ? Number(salvageValue) : undefined,
        depreciationMethod: depreciationMethod || undefined,
        depreciationRate: depreciationMethod === 'REDUCING_BALANCE' && depreciationRate ? Number(depreciationRate) : undefined,
        notes: notes || undefined,
      });
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create asset');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <FormPageHeader
        icon={<MonitorIcon className="h-7 w-7" />}
        title="Register New Asset"
        description="Register a fixed asset or controlled equipment item."
        breadcrumb={[{ label: 'Assets', href: '/assets' }, { label: 'New Asset' }]}
      />

      {error && <ErrorAlert message={error} />}

      <form onSubmit={onSubmit}>
        <Card className="mb-4">
          <CardBody>
            <SectionHeader number={1} title="Asset Details" />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="assetTag">
                  Asset tag <Required />
                </Label>
                <IconInput icon={<TagIcon className="h-4 w-4" />}>
                  <Input
                    id="assetTag"
                    required
                    placeholder="e.g. FA-00123"
                    className="pl-9"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                  />
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="trackingType">
                  Tracking type <Required />
                </Label>
                <IconInput icon={<BoxIcon className="h-4 w-4" />}>
                  <Select
                    id="trackingType"
                    className="pl-9"
                    value={trackingType}
                    onChange={(e) => setTrackingType(e.target.value as AssetTrackingType)}
                  >
                    {TRACKING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                </IconInput>
              </Field>
            </div>

            <Field>
              <Label htmlFor="name">
                Name <Required />
              </Label>
              <IconInput icon={<TypeIcon className="h-4 w-4" />}>
                <Input
                  id="name"
                  required
                  placeholder="Enter asset name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
              <IconInput icon={<ListIcon className="h-4 w-4" />}>
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

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="location">
                  Current location <Required />
                </Label>
                {canQuickCreateLocation && (
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen('location')}
                    className="text-xs font-medium text-gold-dark hover:underline"
                  >
                    + New location
                  </button>
                )}
              </div>
              <IconInput icon={<MapPinIcon className="h-4 w-4" />}>
                <Select
                  id="location"
                  required
                  className="pl-9"
                  value={currentLocationId}
                  onChange={(e) => setCurrentLocationId(e.target.value)}
                >
                  <option value="">Select location</option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </option>
                  ))}
                </Select>
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
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
              <Field>
                <Label htmlFor="model">Model</Label>
                <IconInput icon={<SmartphoneIcon className="h-4 w-4" />}>
                  <Input
                    id="model"
                    placeholder="Enter model"
                    className="pl-9"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </IconInput>
              </Field>
            </div>

            <Field>
              <Label htmlFor="serialNumber">Serial number</Label>
              <IconInput icon={<BarcodeIcon className="h-4 w-4" />}>
                <Input
                  id="serialNumber"
                  placeholder="Enter serial number"
                  className="pl-9"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="purchaseDate">Purchase date</Label>
                <IconInput icon={<CalendarIcon className="h-4 w-4" />}>
                  <Input
                    id="purchaseDate"
                    type="date"
                    className="pl-9"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </IconInput>
              </Field>
              {canSeeCost && (
                <Field>
                  <Label htmlFor="purchaseCost">
                    Purchase cost {requiredFields.includes('purchaseCost') && <Required />}
                  </Label>
                  <IconInput icon={<BanknoteIcon className="h-4 w-4" />}>
                    <Input
                      id="purchaseCost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter amount"
                      className="pl-9"
                      required={requiredFields.includes('purchaseCost')}
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                    />
                  </IconInput>
                </Field>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionHeader number={2} title="Supplier & Warranty" />

            <Field>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="supplier">Supplier</Label>
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
                <Select id="supplier" className="pl-9" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                  <option value="">Select supplier</option>
                  {(suppliers ?? [])
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="warrantyStartDate">
                  Warranty start {requiredFields.includes('warrantyStartDate') && <Required />}
                </Label>
                <IconInput icon={<CalendarIcon className="h-4 w-4" />}>
                  <Input
                    id="warrantyStartDate"
                    type="date"
                    className="pl-9"
                    required={requiredFields.includes('warrantyStartDate')}
                    value={warrantyStartDate}
                    onChange={(e) => setWarrantyStartDate(e.target.value)}
                  />
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="warrantyEndDate">
                  Warranty end {requiredFields.includes('warrantyEndDate') && <Required />}
                </Label>
                <IconInput icon={<CalendarIcon className="h-4 w-4" />}>
                  <Input
                    id="warrantyEndDate"
                    type="date"
                    className="pl-9"
                    required={requiredFields.includes('warrantyEndDate')}
                    value={warrantyEndDate}
                    onChange={(e) => setWarrantyEndDate(e.target.value)}
                  />
                </IconInput>
              </Field>
            </div>

            <Field>
              <Label htmlFor="warrantyProvider">
                Warranty provider {requiredFields.includes('warrantyProvider') && <Required />}
              </Label>
              <IconInput icon={<ShieldIcon className="h-4 w-4" />}>
                <Input
                  id="warrantyProvider"
                  placeholder="Enter warranty provider"
                  className="pl-9"
                  required={requiredFields.includes('warrantyProvider')}
                  value={warrantyProvider}
                  onChange={(e) => setWarrantyProvider(e.target.value)}
                />
              </IconInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="usefulLifeMonths">
                  Useful life (months) {requiredFields.includes('usefulLifeMonths') && <Required />}
                </Label>
                <IconInput icon={<ClockIcon className="h-4 w-4" />}>
                  <Input
                    id="usefulLifeMonths"
                    type="number"
                    min="0"
                    placeholder="Enter useful life in months"
                    className="pl-9"
                    required={requiredFields.includes('usefulLifeMonths')}
                    value={usefulLifeMonths}
                    onChange={(e) => setUsefulLifeMonths(e.target.value)}
                  />
                </IconInput>
              </Field>
              <Field>
                <Label htmlFor="salvageValue">
                  Salvage value {requiredFields.includes('salvageValue') && <Required />}
                </Label>
                <IconInput icon={<BanknoteIcon className="h-4 w-4" />}>
                  <Input
                    id="salvageValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter salvage value"
                    className="pl-9"
                    required={requiredFields.includes('salvageValue')}
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(e.target.value)}
                  />
                </IconInput>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="depreciationMethod">
                  Depreciation method {requiredFields.includes('depreciationMethod') && <Required />}
                </Label>
                <IconInput icon={<LayersIcon className="h-4 w-4" />}>
                  <Select
                    id="depreciationMethod"
                    className="pl-9"
                    required={requiredFields.includes('depreciationMethod')}
                    value={depreciationMethod}
                    onChange={(e) => setDepreciationMethod(e.target.value as '' | DepreciationMethod)}
                  >
                    <option value="">Use system default</option>
                    <option value="STRAIGHT_LINE">Straight-line</option>
                    <option value="REDUCING_BALANCE">Reducing balance</option>
                  </Select>
                </IconInput>
              </Field>
              {depreciationMethod === 'REDUCING_BALANCE' && (
                <Field>
                  <Label htmlFor="depreciationRate">Annual rate (%)</Label>
                  <IconInput icon={<LayersIcon className="h-4 w-4" />}>
                    <Input
                      id="depreciationRate"
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      className="pl-9"
                      value={depreciationRate}
                      onChange={(e) => setDepreciationRate(e.target.value)}
                    />
                  </IconInput>
                </Field>
              )}
            </div>

            <Field>
              <Label htmlFor="condition">Condition</Label>
              <IconInput icon={<HeartIcon className="h-4 w-4" />}>
                <Select id="condition" className="pl-9" value={condition} onChange={(e) => setCondition(e.target.value as AssetCondition)}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </IconInput>
            </Field>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <IconInput icon={<FileTextIcon className="h-4 w-4" />} align="top">
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Enter additional notes…"
                  className="pl-9"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </IconInput>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.push('/assets')}>
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <SaveIcon className="h-4 w-4" />
                {submitting ? 'Saving…' : 'Create Asset'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

      <QuickCreateCategoryModal
        kind="asset"
        open={quickCreateOpen === 'category'}
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(category) => {
          refetchCategories();
          setCategoryId(category.id);
        }}
      />
      <QuickCreateLocationModal
        open={quickCreateOpen === 'location'}
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(location) => {
          refetchLocations();
          setCurrentLocationId(location.id);
        }}
      />
      <QuickCreateSupplierModal
        open={quickCreateOpen === 'supplier'}
        onClose={() => setQuickCreateOpen(null)}
        onCreated={(newSupplier) => {
          refetchSuppliers();
          setSupplier(newSupplier.name);
        }}
      />
    </div>
  );
}
