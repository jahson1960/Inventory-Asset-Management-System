'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError } from '@/lib/api-client';
import type { AssetTransferRecord } from '@/lib/types';
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

export default function AssetTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: transfer, loading, error, refetch } = useApi<AssetTransferRecord>(`/asset-transfers/${id}`);
  const canDecide = useCanDecide('ASSET_TRANSFER', id, transfer?.status === 'PENDING');
  const [actionError, setActionError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const confirm = useConfirm();
  usePrintOnLoad(Boolean(transfer));

  if (loading) return <PageLoading />;
  if (error || !transfer) return <ErrorAlert message={error ?? 'Transfer not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this transfer?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/asset-transfers/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel transfer');
    }
  }

  async function acknowledge() {
    const ok = await confirm({ title: 'Confirm receipt of this asset?', message: 'This marks the transfer as complete on your end.' });
    if (!ok) return;
    setAcknowledging(true);
    setActionError(null);
    try {
      await api.post(`/asset-transfers/${id}/acknowledge`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={transfer.asset?.name ?? transfer.assetId}
        description={`${transfer.fromLocation?.name ?? '—'} → ${transfer.toLocation?.name ?? '—'}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(transfer.status)}>{transfer.status}</Badge>
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
            <Row label="Reason" value={transfer.reason} />
            <Row
              label="New custodian"
              value={transfer.toCustodian ? `${transfer.toCustodian.firstName} ${transfer.toCustodian.lastName}` : 'Unchanged'}
            />
            <Row label="Receiving acknowledged" value={transfer.receivingAcknowledged ? 'Yes' : 'Pending'} />
          </CardBody>
        </Card>

        {transfer.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/asset-transfers/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {transfer.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Transfer
          </Button>
        )}

        {transfer.status === 'COMPLETED' && !transfer.receivingAcknowledged && (
          <RequirePermission permission="assetTransfers.create">
            <Card className="no-print">
              <CardHeader>Acknowledge receipt</CardHeader>
              <CardBody>
                <Button onClick={acknowledge} disabled={acknowledging}>
                  {acknowledging ? 'Acknowledging…' : 'Confirm received'}
                </Button>
              </CardBody>
            </Card>
          </RequirePermission>
        )}

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="ASSET_TRANSFER" entityId={id} />
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
