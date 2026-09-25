'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Asset, AssetTransferRecord, LocationNode, Paginated, Staff } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewAssetTransferPage() {
  return (
    <Suspense>
      <NewAssetTransferForm />
    </Suspense>
  );
}

function NewAssetTransferForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: assetsPage } = useApi<Paginated<Asset>>('/assets', { pageSize: 1000 });
  const assets = assetsPage?.items;
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { pageSize: 1000 });
  const locations = locationsPage?.items;

  const [assetId, setAssetId] = useState(searchParams.get('assetId') ?? '');
  const [toLocationId, setToLocationId] = useState('');
  const [toCustodianId, setToCustodianId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const selectedAsset = (assets ?? []).find((a) => a.id === assetId);
  const { data: destinationStaffPage } = useApi<Paginated<Staff>>(toLocationId ? '/staff' : null, {
    branchId: locations?.find((l) => l.id === toLocationId)?.branchId,
    pageSize: 1000,
  });
  const destinationStaff = destinationStaffPage?.items;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Submit this transfer request?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const transfer = await api.post<AssetTransferRecord>('/asset-transfers', {
        assetId,
        toLocationId,
        toCustodianId: toCustodianId || undefined,
        reason,
      });
      router.push(`/asset-transfers/${transfer.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Asset Transfer" description="Move an asset to a different location." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="asset">Asset</Label>
              <Select id="asset" required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">Select asset</option>
                {(assets ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </Select>
              {selectedAsset && (
                <p className="mt-1 text-xs text-slate-400">Currently at: {selectedAsset.currentLocation?.name ?? '—'}</p>
              )}
            </Field>

            <Field>
              <Label htmlFor="toLocation">Destination location</Label>
              <Select id="toLocation" required value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                <option value="">Select destination</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.type})
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="toCustodian">New custodian (optional)</Label>
              <Select id="toCustodian" value={toCustodianId} onChange={(e) => setToCustodianId(e.target.value)}>
                <option value="">Keep current custodian</option>
                {(destinationStaff ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" rows={2} required value={reason} onChange={(e) => setReason(e.target.value)} />
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
