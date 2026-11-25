'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Asset, AssetCondition, MaintenanceRequestRecord, Paginated, Technician } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

const CONDITIONS: AssetCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function LogMaintenancePage() {
  return (
    <Suspense>
      <LogMaintenanceForm />
    </Suspense>
  );
}

function LogMaintenanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: assetsPage } = useApi<Paginated<Asset>>('/assets', { pageSize: 1000 });
  const { data: techniciansPage } = useApi<Paginated<Technician>>('/technicians', { pageSize: 1000 });
  const assets = assetsPage?.items;
  const technicians = (techniciansPage?.items ?? []).filter((t) => t.isActive);

  const [assetId, setAssetId] = useState(searchParams.get('assetId') ?? '');
  const [description, setDescription] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [vendor, setVendor] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workPerformed, setWorkPerformed] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [cost, setCost] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [assetConditionAfter, setAssetConditionAfter] = useState<AssetCondition | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Log this maintenance?', message: 'This records the work as already completed.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await api.post<MaintenanceRequestRecord>('/maintenance-requests/log', {
        assetId,
        description: description || undefined,
        technicianId: technicianId || undefined,
        vendor: vendor || undefined,
        serviceDate: serviceDate || undefined,
        workPerformed: workPerformed || undefined,
        partsUsed: partsUsed || undefined,
        cost: cost ? Number(cost) : undefined,
        nextMaintenanceDate: nextMaintenanceDate || undefined,
        assetConditionAfter: assetConditionAfter || undefined,
      });
      router.push(`/maintenance/${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log maintenance');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Log Maintenance" description="Record routine or preventive maintenance that's already been completed." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="asset" required>Asset</Label>
              <Select id="asset" required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">Select asset</option>
                {(assets ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="e.g. Routine 6-month servicing"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="technicianId">Technician</Label>
                <Select id="technicianId" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                  <option value="">None</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </Field>
            </div>

            <Field>
              <Label htmlFor="serviceDate" required>Service date</Label>
              <Input id="serviceDate" type="date" required value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            </Field>

            <Field>
              <Label htmlFor="workPerformed">Work performed</Label>
              <Textarea id="workPerformed" rows={2} value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} />
            </Field>

            <Field>
              <Label htmlFor="partsUsed">Parts used</Label>
              <Input id="partsUsed" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="cost">Cost</Label>
                <Input id="cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
              </Field>
              <Field>
                <Label htmlFor="nextMaintenanceDate">Next maintenance date</Label>
                <Input
                  id="nextMaintenanceDate"
                  type="date"
                  value={nextMaintenanceDate}
                  onChange={(e) => setNextMaintenanceDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="assetConditionAfter">Asset condition after</Label>
              <Select
                id="assetConditionAfter"
                value={assetConditionAfter}
                onChange={(e) => setAssetConditionAfter(e.target.value as AssetCondition)}
              >
                <option value="">Unchanged</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting || !assetId}>
                {submitting ? 'Saving…' : 'Log Maintenance'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
