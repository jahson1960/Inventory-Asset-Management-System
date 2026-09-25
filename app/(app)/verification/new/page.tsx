'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { Branch, LocationNode, Paginated, VerificationCampaignRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function NewVerificationCampaignPage() {
  const router = useRouter();
  const { data: branchesPage } = useApi<Paginated<Branch>>('/branches', { pageSize: 1000 });
  const branches = branchesPage?.items;
  const [branchId, setBranchId] = useState('');
  const { data: locationsPage } = useApi<Paginated<LocationNode>>(branchId ? '/locations' : null, { branchId, pageSize: 1000 });
  const locations = locationsPage?.items;

  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Start this verification campaign?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await api.post<VerificationCampaignRecord>('/verification-campaigns', {
        name,
        branchId,
        locationId: locationId || undefined,
        startDate,
        dueDate,
      });
      router.push(`/verification/${campaign.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="New Verification Campaign"
        description="Every asset in the chosen branch (or location) is added to the campaign to be checked off."
      />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="name" required>Campaign name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q1 2026 Lagos Verification" />
            </Field>

            <Field>
              <Label htmlFor="branch" required>Branch</Label>
              <Select
                id="branch"
                required
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setLocationId('');
                }}
              >
                <option value="">Select branch</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="location">Narrow to one location</Label>
              <Select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!branchId}>
                <option value="">Whole branch</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.type})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="startDate" required>Start date</Label>
                <Input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field>
                <Label htmlFor="dueDate" required>Due date</Label>
                <Input id="dueDate" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
