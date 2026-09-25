'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Asset, MaintenanceRequestRecord, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewMaintenanceRequestPage() {
  return (
    <Suspense>
      <NewMaintenanceRequestForm />
    </Suspense>
  );
}

function NewMaintenanceRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: assetsPage } = useApi<Paginated<Asset>>('/assets', { pageSize: 1000 });
  const assets = assetsPage?.items;

  const [assetId, setAssetId] = useState(searchParams.get('assetId') ?? '');
  const [faultDescription, setFaultDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Report this fault?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await api.post<MaintenanceRequestRecord>('/maintenance-requests', {
        assetId,
        faultDescription,
      });
      router.push(`/maintenance/${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to report fault');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Report Fault" description="Report a fault or issue with an asset." />

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
              <Label htmlFor="faultDescription" required>Fault description</Label>
              <Textarea
                id="faultDescription"
                rows={3}
                required
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Report Fault'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
