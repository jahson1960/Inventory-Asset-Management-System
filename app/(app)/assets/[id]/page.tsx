'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { api, ApiError, fetchAuthenticatedObjectUrl, fileUrl, uploadFile } from '@/lib/api-client';
import type { Asset, AssetAssignment, AssetStatus, DisplaySettingsRecord, Paginated, Staff } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';

const STATUSES: AssetStatus[] = ['IN_STORE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST'];

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: asset, loading, error, refetch } = useApi<Asset>(`/assets/${id}`);
  const { data: assignments, refetch: refetchAssignments } = useApi<AssetAssignment[]>(`/assets/${id}/assignments`);
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();

  if (loading) return <PageLoading />;
  if (error || !asset) return <ErrorAlert message={error ?? 'Asset not found'} />;

  const activeAssignment = assignments?.find((a) => a.status === 'ACTIVE');

  async function onReturn() {
    if (!activeAssignment) return;
    const ok = await confirm({
      title: 'Return this asset?',
      message: 'The active assignment will be closed and the asset marked back in store.',
    });
    if (!ok) return;
    setActionError(null);
    try {
      await api.post(`/assignments/${activeAssignment.id}/return`, {});
      refetch();
      refetchAssignments();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to return asset');
    }
  }

  async function onStatusChange(status: AssetStatus) {
    const ok = await confirm({ title: 'Change asset status?', message: `Set status to ${status.replace('_', ' ')}.` });
    if (!ok) return;
    setStatusSubmitting(true);
    setActionError(null);
    try {
      await api.patch(`/assets/${id}/status`, { status });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function onUpload(file: File) {
    setActionError(null);
    try {
      await uploadFile(`/assets/${id}/attachments`, file, { fileType: 'DOCUMENT' });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to upload file');
    }
  }

  return (
    <div>
      <PageHeader
        title={asset.name}
        description={`Asset tag: ${asset.assetTag}`}
        action={
          <RequirePermission permission="assets.manage">
            <div className="flex gap-2">
              {!asset.currentCustodianId && (
                <Button onClick={() => setAssignOpen(true)}>Assign to Staff</Button>
              )}
              {activeAssignment && (
                <Button variant="secondary" onClick={onReturn}>
                  Return
                </Button>
              )}
              <Link href={`/asset-transfers/new?assetId=${asset.id}`}>
                <Button variant="secondary">Request Transfer</Button>
              </Link>
            </div>
          </RequirePermission>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/maintenance/new?assetId=${asset.id}`}>
          <Button variant="secondary" size="sm">
            Report Fault
          </Button>
        </Link>
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>Details</CardHeader>
          <CardBody className="space-y-2 text-sm">
            <DetailRow label="Category" value={asset.category?.name ?? '—'} />
            <DetailRow label="Brand / Model" value={[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'} />
            <DetailRow label="Serial number" value={asset.serialNumber ?? '—'} />
            <DetailRow label="Condition" value={asset.condition} />
            <DetailRow label="Location" value={asset.currentLocation?.name ?? '—'} />
            <DetailRow label="Custodian">
              {asset.currentCustodian ? (
                `${asset.currentCustodian.firstName} ${asset.currentCustodian.lastName}`
              ) : (
                <span className="text-slate-400">Unassigned</span>
              )}
            </DetailRow>
            <DetailRow label="Purchase cost" value={asset.purchaseCost ? `₦${Number(asset.purchaseCost).toLocaleString()}` : '—'} />
            <DetailRow label="Warranty ends" value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'} />
            <RequirePermission permission="assets.manage">
              <div className="pt-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={asset.status}
                  disabled={statusSubmitting}
                  onChange={(e) => onStatusChange(e.target.value as AssetStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>
            </RequirePermission>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>Assignment history</CardHeader>
          {!assignments || assignments.length === 0 ? (
            <EmptyState message="This asset has never been assigned." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Staff</Th>
                  <Th>Assigned</Th>
                  <Th>Returned</Th>
                  <Th>Acknowledged</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {assignments.map((a) => (
                  <Tr key={a.id}>
                    <Td className="font-medium text-slate-900">
                      {a.staff ? `${a.staff.firstName} ${a.staff.lastName}` : a.staffId}
                    </Td>
                    <Td>{new Date(a.assignedAt).toLocaleDateString()}</Td>
                    <Td>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <Badge tone={a.acknowledged ? 'green' : 'amber'}>{a.acknowledged ? 'Yes' : 'Pending'}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}

          <div className="border-t border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
            {asset.attachments && asset.attachments.length > 0 ? (
              <ul className="mb-3 space-y-1 text-sm">
                {asset.attachments.map((att) => (
                  <li key={att.id}>
                    <a href={fileUrl(att.fileUrl)} target="_blank" rel="noreferrer" className="text-gold-dark hover:underline">
                      {att.label ?? att.fileUrl.split('/').pop()}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-slate-400">No documents or photos attached.</p>
            )}
            <RequirePermission permission="assets.manage">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = '';
                }}
                className="text-sm"
              />
            </RequirePermission>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <QrLabelCard
          assetId={id}
          assetTag={asset.assetTag}
          assetName={asset.name}
          qrCodeEnabled={displaySettings?.qrCodeEnabled ?? false}
        />
        <DepreciationCard asset={asset} />
      </div>

      <AssignModal
        open={assignOpen}
        assetId={id}
        branchId={asset.branchId}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          setAssignOpen(false);
          refetch();
          refetchAssignments();
        }}
      />
    </div>
  );
}

function QrLabelCard({
  assetId,
  assetTag,
  assetName,
  qrCodeEnabled,
}: {
  assetId: string;
  assetTag: string;
  assetName: string;
  qrCodeEnabled: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!qrCodeEnabled) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    fetchAuthenticatedObjectUrl(`/assets/${assetId}/qr-code`)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setImageUrl(url);
      })
      .catch(() => {
        // QR code is a nice-to-have on this page; a failed fetch just leaves the card without an image.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, qrCodeEnabled]);

  return (
    <Card>
      <CardHeader>Asset Label</CardHeader>
      <CardBody className="flex flex-col items-center gap-2 text-center">
        {qrCodeEnabled &&
          (imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`QR code for ${assetTag}`} width={160} height={160} />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-xs text-slate-400">Loading…</div>
          ))}
        <p className="text-lg font-semibold text-slate-900">{assetTag}</p>
        <p className="text-xs text-slate-500">{assetName}</p>
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
          Print Label
        </Button>
      </CardBody>
    </Card>
  );
}

function DepreciationCard({ asset }: { asset: Asset }) {
  const d = asset.depreciation;
  return (
    <Card>
      <CardHeader>Depreciation</CardHeader>
      <CardBody className="space-y-2 text-sm">
        {d ? (
          <>
            <DetailRow label="Method" value={d.method.replace('_', ' ')} />
            <DetailRow label="Months elapsed" value={String(d.monthsElapsed)} />
            <DetailRow label="Accumulated depreciation" value={`₦${Number(d.accumulatedDepreciation).toLocaleString()}`} />
            <DetailRow label="Net book value" value={`₦${Number(d.netBookValue).toLocaleString()}`} />
          </>
        ) : (
          <p className="text-slate-400">Not enough data (purchase cost, purchase date, and useful life or a rate are required).</p>
        )}
      </CardBody>
    </Card>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      {children ?? <span className="font-medium text-slate-900">{value}</span>}
    </div>
  );
}

function AssignModal({
  open,
  assetId,
  branchId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  assetId: string;
  branchId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { data: staffPage } = useApi<Paginated<Staff>>(open ? '/staff' : null, { branchId, pageSize: 1000 });
  const staff = staffPage?.items;
  const [staffId, setStaffId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Assign this asset?', message: 'The selected staff member will become the custodian.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/assignments', { assetId, staffId, notes: notes || undefined });
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign asset');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Asset">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="staff">Staff member</Label>
          <Select id="staff" required value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Select staff</option>
            {(staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.staffNumber})
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !staffId}>
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
