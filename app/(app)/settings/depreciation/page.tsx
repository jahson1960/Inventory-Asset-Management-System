'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { DepreciationSettingsRecord, DepreciationMethod } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Label, Select, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function DepreciationSettingsPage() {
  const { data: settings, loading, refetch } = useApi<DepreciationSettingsRecord>('/settings/depreciation');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Depreciation"
        description="Set the organization-wide default depreciation method. Individual assets may override this."
      />
      <Card>
        <CardBody>
          <DepreciationForm settings={settings} onSaved={refetch} />
        </CardBody>
      </Card>
    </div>
  );
}

function DepreciationForm({ settings, onSaved }: { settings?: DepreciationSettingsRecord; onSaved: () => void }) {
  const [method, setMethod] = useState<DepreciationMethod>(settings?.defaultMethod ?? 'STRAIGHT_LINE');
  const [rate, setRate] = useState(settings?.defaultDecliningBalanceRate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save these depreciation settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/depreciation', {
        defaultMethod: method,
        defaultDecliningBalanceRate: method === 'REDUCING_BALANCE' && rate !== '' ? Number(rate) : undefined,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save depreciation settings');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}
      <Field>
        <Label htmlFor="method">Default method</Label>
        <Select id="method" value={method} onChange={(e) => setMethod(e.target.value as DepreciationMethod)}>
          <option value="STRAIGHT_LINE">Straight-line</option>
          <option value="REDUCING_BALANCE">Reducing balance</option>
        </Select>
      </Field>

      {method === 'REDUCING_BALANCE' && (
        <Field>
          <Label htmlFor="rate">Default annual rate (%)</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 20"
          />
        </Field>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
