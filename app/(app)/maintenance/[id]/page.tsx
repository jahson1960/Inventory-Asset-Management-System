'use client';

import { use, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { useCanDecide } from '@/hooks/use-can-decide';
import { usePrintOnLoad } from '@/hooks/use-print-on-load';
import { api, ApiError, fileUrl, uploadFile } from '@/lib/api-client';
import type { AssetCondition, MaintenanceRequestRecord, Paginated, Technician } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { DecidePanel } from '@/components/decide-panel';
import { ApprovalHistory } from '@/components/approval-history';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

const CONDITIONS: AssetCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function MaintenanceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: request, loading, error, refetch } = useApi<MaintenanceRequestRecord>(`/maintenance-requests/${id}`);
  const canDecide = useCanDecide('MAINTENANCE_REQUEST', id, request?.status === 'PENDING');
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
      await api.post(`/maintenance-requests/${id}/cancel`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel request');
    }
  }

  async function onUpload(file: File) {
    setActionError(null);
    try {
      await uploadFile(`/maintenance-requests/${id}/attachments`, file, { fileType: 'DOCUMENT' });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to upload file');
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={request.asset?.name ?? request.assetId}
        description={`Reported by ${request.reportedBy?.firstName} ${request.reportedBy?.lastName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(request.status)}>{request.status === 'FULFILLED' ? 'RESOLVED' : request.status}</Badge>
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
            <Row label="Fault" value={request.faultDescription} />
            {request.technician && (
              <Row
                label="Sent to technician"
                value={`${request.technician.name}${request.sentToTechnicianAt ? ` (${new Date(request.sentToTechnicianAt).toLocaleDateString()})` : ''}`}
              />
            )}
            {request.status === 'FULFILLED' && (
              <>
                <Row
                  label="Returned"
                  value={`${request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString() : '—'}${request.resolvedBy ? ` by ${request.resolvedBy.firstName} ${request.resolvedBy.lastName}` : ''}`}
                />
                <Row label="Vendor" value={request.vendor ?? '—'} />
                <Row label="Work performed" value={request.workPerformed ?? '—'} />
                <Row label="Parts used" value={request.partsUsed ?? '—'} />
                <Row label="Cost" value={request.cost ? `₦${Number(request.cost).toLocaleString()}` : '—'} />
                <Row label="Next maintenance" value={request.nextMaintenanceDate ? new Date(request.nextMaintenanceDate).toLocaleDateString() : '—'} />
                <Row label="Condition after" value={request.assetConditionAfter ?? '—'} />
              </>
            )}
          </CardBody>
        </Card>

        {request.status === 'PENDING' && canDecide && (
          <div className="no-print">
            <DecidePanel decidePath={`/maintenance-requests/${id}/decide`} onDecided={refetch} />
          </div>
        )}

        {request.status === 'PENDING' && (
          <Button variant="secondary" onClick={cancel} className="no-print">
            Cancel Request
          </Button>
        )}

        {request.status === 'APPROVED' && !request.technicianId && (
          <RequirePermission permission="maintenance.resolve">
            <div className="no-print">
              <SendToTechnicianPanel requestId={id} onSent={refetch} />
            </div>
          </RequirePermission>
        )}

        {request.status === 'APPROVED' && (
          <RequirePermission permission="maintenance.resolve">
            <div className="no-print">
              <ResolvePanel requestId={id} sentToTechnician={Boolean(request.technicianId)} onResolved={refetch} />
            </div>
          </RequirePermission>
        )}

        <Card>
          <CardHeader>Attachments</CardHeader>
          <CardBody>
            {request.attachments && request.attachments.length > 0 ? (
              <ul className="mb-3 space-y-1 text-sm">
                {request.attachments.map((att) => (
                  <li key={att.id}>
                    <a href={fileUrl(att.fileUrl)} target="_blank" rel="noreferrer" className="text-gold-dark hover:underline">
                      {att.label ?? att.fileUrl.split('/').pop()}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-slate-400">No documents attached.</p>
            )}
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
              className="no-print text-sm"
            />
          </CardBody>
        </Card>

        <Card className="no-print">
          <CardHeader>Approval history</CardHeader>
          <CardBody>
            <ApprovalHistory entityType="MAINTENANCE_REQUEST" entityId={id} />
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

function SendToTechnicianPanel({ requestId, onSent }: { requestId: string; onSent: () => void }) {
  const { data: techniciansPage } = useApi<Paginated<Technician>>('/technicians', { pageSize: 1000 });
  const technicians = (techniciansPage?.items ?? []).filter((t) => t.isActive);
  const [technicianId, setTechnicianId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Send this asset to the technician?', message: 'The asset will be marked under maintenance.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/maintenance-requests/${requestId}/send-to-technician`, { technicianId });
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send to technician');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>Send to Technician</CardHeader>
      <CardBody>
        {error && <ErrorAlert message={error} />}
        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="technicianId" required>Technician</Label>
            <Select id="technicianId" required value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
              <option value="">Select technician</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting || !technicianId}>
              {submitting ? 'Sending…' : 'Send to Technician'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function ResolvePanel({
  requestId,
  sentToTechnician,
  onResolved,
}: {
  requestId: string;
  sentToTechnician: boolean;
  onResolved: () => void;
}) {
  const [vendor, setVendor] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [cost, setCost] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [assetConditionAfter, setAssetConditionAfter] = useState<AssetCondition | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({
      title: sentToTechnician ? 'Record this asset as returned?' : 'Resolve this fault?',
      message: 'The asset will be marked back in store.',
    });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/maintenance-requests/${requestId}/resolve`, {
        vendor: vendor || undefined,
        workPerformed: workPerformed || undefined,
        partsUsed: partsUsed || undefined,
        cost: cost ? Number(cost) : undefined,
        nextMaintenanceDate: nextMaintenanceDate || undefined,
        assetConditionAfter: assetConditionAfter || undefined,
      });
      onResolved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>{sentToTechnician ? 'Record Return' : 'Resolve this fault'}</CardHeader>
      <CardBody>
        {error && <ErrorAlert message={error} />}
        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="workPerformed">Work performed</Label>
            <Textarea id="workPerformed" rows={2} value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="partsUsed">Parts used</Label>
            <Input id="partsUsed" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="nextMaintenanceDate">Next maintenance date</Label>
              <Input
                id="nextMaintenanceDate"
                type="date"
                value={nextMaintenanceDate}
                onChange={(e) => setNextMaintenanceDate(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <Label htmlFor="assetConditionAfter">Asset condition after repair</Label>
            <Select
              id="assetConditionAfter"
              value={assetConditionAfter}
              onChange={(e) => setAssetConditionAfter(e.target.value as AssetCondition)}
            >
              <option value="">Unchanged</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : sentToTechnician ? 'Mark Returned' : 'Resolve'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
