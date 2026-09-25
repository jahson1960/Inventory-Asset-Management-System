'use client';

import { use, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError } from '@/lib/api-client';
import type { Asset, AssetRequestRecord, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Label, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { DecidePanel } from '@/components/decide-panel';
import { ApprovalHistory } from '@/components/approval-history';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function AssetRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: request, loading, error, refetch } = useApi<AssetRequestRecord>(`/asset-requests/${id}`);
  const canDecide = useCanDecide('ASSET_REQUEST', id, request?.status === 'PENDING');
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();
  usePrintOnLoad(Boolean(request));

  if (loading) return <PageLoading />;
  if (error || !request) return <ErrorAlert message={error ?? 'Request not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this request?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/asset-requests/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel request');
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={request.name}
        description={`Requested by ${request.requestedBy?.firstName} ${request.requestedBy?.lastName} for ${request.department?.name}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(request.status)}>{request.status}</Badge>
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
              Print
            </Button>
          </div>
        }
      />

      {actionError && <ErrorAlert message={actionError} />}

      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-2 text-sm">
            <Row label="Quantity" value={String(request.quantity)} />
            <Row label="Description" value={request.description ?? '—'} />
            <Row label="Justification" value={request.justification ?? '—'} />
            <Row label="Estimated cost" value={request.estimatedCost ? `₦${Number(request.estimatedCost).toLocaleString()}` : '—'} />
            <Row label="Category" value={request.category?.name ?? '—'} />
            {request.fulfilledAsset && (
              <Row
                label="Fulfilled with"
                value=""
              >
                <Link href={`/assets/${request.fulfilledAsset.id}`} className="text-gold-dark hover:underline">
                  {request.fulfilledAsset.assetTag} — {request.fulfilledAsset.name}
                </Link>
              </Row>
            )}
          </CardBody>
        </Card>

        {request.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/asset-requests/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {request.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Request
          </Button>
        )}

        {request.status === 'APPROVED' && (
          <RequirePermission permission="assetRequests.fulfill">
            <div className="no-print">
              <FulfillPanel requestId={id} onFulfilled={refetch} />
            </div>
          </RequirePermission>
        )}

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="ASSET_REQUEST" entityId={id} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      {children ?? <span className="text-right font-medium text-slate-900">{value}</span>}
    </div>
  );
}

function FulfillPanel({ requestId, onFulfilled }: { requestId: string; onFulfilled: () => void }) {
  const { data: assetsPage } = useApi<Paginated<Asset>>('/assets', { unassigned: true, pageSize: 1000 });
  const assets = assetsPage?.items;
  const [assetId, setAssetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Fulfil this request?', message: 'The selected asset will be assigned to the requester.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/asset-requests/${requestId}/fulfill`, { assetId });
      onFulfilled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fulfil request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>Fulfil this request</CardHeader>
      <CardBody>
        {error && <ErrorAlert message={error} />}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <Field>
            <Label htmlFor="asset" required>Link to an existing (unassigned) asset</Label>
            <Select id="asset" required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Select asset</option>
              {(assets ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={submitting || !assetId}>
            {submitting ? 'Fulfilling…' : 'Fulfil'}
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          If the asset hasn&apos;t been registered yet, <Link href="/assets/new" className="text-gold-dark hover:underline">create it first</Link>.
        </p>
      </CardBody>
    </Card>
  );
}
