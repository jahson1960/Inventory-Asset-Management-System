'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import type { Asset, Department, EquipmentLoanRequestRecord, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { DepartmentField } from '@/components/department-field';

export default function NewLoanRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: assetsPage } = useApi<Paginated<Asset>>('/assets', { trackingType: 'CONTROLLED_EQUIPMENT', pageSize: 1000 });
  const assets = assetsPage?.items;
  const { data: departmentsPage } = useApi<Paginated<Department>>('/departments', { pageSize: 1000 });
  const departments = departmentsPage?.items;

  const [assetId, setAssetId] = useState('');
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '');
  const [purpose, setPurpose] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Submit this loan request?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await api.post<EquipmentLoanRequestRecord>('/loan-requests', {
        assetId,
        departmentId,
        purpose,
        expectedReturnDate,
      });
      router.push(`/loans/${request.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit loan request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Loan Request" description="Request temporary equipment for a defined period." />

      <Card>
        <CardBody>
          {error && <ErrorAlert message={error} />}
          <form onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="asset" required>Equipment</Label>
              <Select id="asset" required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">Select equipment</option>
                {(assets ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <DepartmentField departmentId={departmentId} onChange={setDepartmentId} departments={departments ?? []} />

            <Field>
              <Label htmlFor="expectedReturnDate" required>Expected return date</Label>
              <Input
                id="expectedReturnDate"
                type="date"
                required
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </Field>

            <Field>
              <Label htmlFor="purpose" required>Purpose</Label>
              <Textarea id="purpose" rows={2} required value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </Field>

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
