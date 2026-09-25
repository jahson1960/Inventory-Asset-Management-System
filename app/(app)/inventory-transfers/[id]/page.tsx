'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError } from '@/lib/api-client';
import type { InventoryTransferRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { DecidePanel } from '@/components/decide-panel';
import { ApprovalHistory } from '@/components/approval-history';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function InventoryTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: transfer, loading, error, refetch } = useApi<InventoryTransferRecord>(`/inventory-transfers/${id}`);
  const canDecide = useCanDecide('INVENTORY_TRANSFER', id, transfer?.status === 'PENDING');
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();
  usePrintOnLoad(Boolean(transfer));

  if (loading) return <PageLoading />;
  if (error || !transfer) return <ErrorAlert message={error ?? 'Transfer not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this transfer?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/inventory-transfers/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel transfer');
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`${transfer.quantity} ${transfer.unit?.code ?? ''} of ${transfer.item?.name ?? ''}`}
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
            <Row label="Reason" value={transfer.reason ?? '—'} />
          </CardBody>
        </Card>

        {transfer.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/inventory-transfers/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {transfer.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Transfer
          </Button>
        )}

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="INVENTORY_TRANSFER" entityId={id} />
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
