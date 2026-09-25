'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError } from '@/lib/api-client';
import type { InventoryRequestRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { DecidePanel } from '@/components/decide-panel';
import { ApprovalHistory } from '@/components/approval-history';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function InventoryRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: request, loading, error, refetch } = useApi<InventoryRequestRecord>(`/inventory-requests/${id}`);
  const canDecide = useCanDecide('INVENTORY_REQUEST', id, request?.status === 'PENDING');
  const [actionError, setActionError] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const confirm = useConfirm();
  usePrintOnLoad(Boolean(request));

  if (loading) return <PageLoading />;
  if (error || !request) return <ErrorAlert message={error ?? 'Request not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this request?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/inventory-requests/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel request');
    }
  }

  async function fulfill() {
    const ok = await confirm({ title: 'Issue this from stock?', message: 'Stock will be deducted and issued to the requester.' });
    if (!ok) return;
    setFulfilling(true);
    setActionError(null);
    try {
      await api.post(`/inventory-requests/${id}/fulfill`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to issue request');
    } finally {
      setFulfilling(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`${request.quantityRequested} ${request.unit?.code ?? ''} of ${request.item?.name ?? ''}`}
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
            <Row label="Store" value={request.location?.name ?? '—'} />
            <Row label="Purpose" value={request.purpose ?? '—'} />
          </CardBody>
        </Card>

        {request.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/inventory-requests/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {request.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Request
          </Button>
        )}

        {request.status === 'APPROVED' && (
          <RequirePermission permission="inventoryRequests.fulfill">
            <Card className="no-print">
              <CardHeader>Fulfil this request</CardHeader>
              <CardBody>
                <Button onClick={fulfill} disabled={fulfilling}>
                  {fulfilling ? 'Issuing…' : 'Issue from stock'}
                </Button>
              </CardBody>
            </Card>
          </RequirePermission>
        )}

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="INVENTORY_REQUEST" entityId={id} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
