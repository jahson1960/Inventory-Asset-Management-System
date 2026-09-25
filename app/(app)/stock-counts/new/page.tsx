'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { LocationNode, Paginated, StockCountSessionRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewStockCountSessionPage() {
  const router = useRouter();
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { type: 'STORE', pageSize: 1000 });
  const locations = locationsPage?.items;

  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Start this stock count session?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.post<StockCountSessionRecord>('/stock-count-sessions', { name, locationId });
      router.push(`/stock-counts/${session.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="New Stock Count Session" description="Snapshots current system balances for every item at the chosen store." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="name">Session name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. September Stock Count" />
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
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Start Count'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
