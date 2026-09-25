'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import type { AssetCategory, AssetRequestRecord, Department, DisplaySettingsRecord, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DepartmentField } from '@/components/department-field';

export default function NewAssetRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;
  const { data: categoriesPage } = useApi<Paginated<AssetCategory>>('/asset-categories', { pageSize: 1000 });
  const categories = categoriesPage?.items;
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const estimatedCostEnabled = displaySettings?.estimatedCostEnabled ?? false;

  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Submit this request?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await api.post<AssetRequestRecord>('/asset-requests', {
        departmentId,
        categoryId: categoryId || undefined,
        name,
        quantity: Number(quantity),
        description: description || undefined,
        justification: justification || undefined,
        estimatedCost: estimatedCostEnabled && estimatedCost ? Number(estimatedCost) : undefined,
      });
      router.push(`/asset-requests/${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Asset Request" description="Request a new asset for your department." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field>
                  <Label htmlFor="name" required>What do you need?</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HP LaserJet printer" />
                </Field>
              </div>
              <Field>
                <Label htmlFor="quantity" required>Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>

            <DepartmentField departmentId={departmentId} onChange={setDepartmentId} departments={departments ?? []} />

            <Field>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Not sure</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <Field>
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Why is this needed?"
              />
            </Field>

            {estimatedCostEnabled && (
              <Field>
                <Label htmlFor="estimatedCost">Estimated cost</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </Field>
            )}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
