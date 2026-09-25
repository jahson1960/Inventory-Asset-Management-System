'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError } from '@/lib/api-client';
import type { EquipmentLoanRequestRecord } from '@/lib/types';
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

export default function LoanRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: request, loading, error, refetch } = useApi<EquipmentLoanRequestRecord>(`/loan-requests/${id}`);
  const canDecide = useCanDecide('EQUIPMENT_LOAN', id, request?.status === 'PENDING');
  const [actionError, setActionError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const confirm = useConfirm();
  usePrintOnLoad(Boolean(request));

  if (loading) return <PageLoading />;
  if (error || !request) return <ErrorAlert message={error ?? 'Request not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this request?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/loan-requests/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel request');
    }
  }

  async function issue() {
    const ok = await confirm({ title: 'Issue this equipment?', message: 'The asset will be handed out on loan.' });
    if (!ok) return;
    setIssuing(true);
    setActionError(null);
    try {
      await api.post(`/loan-requests/${id}/issue`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to issue loan');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={request.asset?.name ?? request.assetId}
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
            <Row label="Purpose" value={request.purpose} />
            <Row label="Expected return" value={new Date(request.expectedReturnDate).toLocaleDateString()} />
          </CardBody>
        </Card>

        {request.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/loan-requests/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {request.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Request
          </Button>
        )}

        {request.status === 'APPROVED' && (
          <RequirePermission permission="loans.issue">
            <Card className="no-print">
              <CardHeader>Issue this loan</CardHeader>
              <CardBody>
                <Button onClick={issue} disabled={issuing}>
                  {issuing ? 'Issuing…' : 'Issue equipment'}
                </Button>
              </CardBody>
            </Card>
          </RequirePermission>
        )}

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="EQUIPMENT_LOAN" entityId={id} />
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
