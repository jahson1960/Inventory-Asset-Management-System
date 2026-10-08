'use client';

import { use, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { api, ApiError, fetchAuthenticatedObjectUrl, fileUrl, uploadFile } from '@/lib/api-client';
import type { Asset, AssetAssignment, AssetStatus, CurrentUser, DisplaySettingsRecord, MaintenanceRequestRecord, Paginated, Technician } from '@/lib/types';
import { statusTone, type BadgeTone } from '@/lib/status-tone';
import { cn } from '@/lib/cn';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Label, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_TONE } from '@/lib/assignment-status';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  BarChart3Icon,
  BarcodeIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileClockIcon,
  FileTextIcon,
  ListIcon,
  MapPinIcon,
  MonitorIcon,
  PaperclipIcon,
  PencilIcon,
  PrinterIcon,
  ShieldIcon,
  TagIcon,
  UploadCloudIcon,
  UserIcon,
} from '@/components/icons/form-icons';

const STATUSES: AssetStatus[] = ['IN_STORE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST'];

const ASSET_STATUS_TONE: Record<AssetStatus, BadgeTone> = {
  IN_STORE: 'green',
  ASSIGNED: 'blue',
  UNDER_MAINTENANCE: 'amber',
  RETIRED: 'neutral',
  DISPOSED: 'red',
  LOST: 'red',
};

const CONDITION_TONE: Record<string, BadgeTone> = {
  NEW: 'green',
  GOOD: 'green',
  FAIR: 'amber',
  POOR: 'amber',
  DAMAGED: 'red',
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: asset, loading, error, refetch } = useApi<Asset>(`/assets/${id}`);
  const { data: assignments, refetch: refetchAssignments } = useApi<AssetAssignment[]>(`/assets/${id}/assignments`);
  const { data: maintenanceHistory, refetch: refetchMaintenance } = useApi<MaintenanceRequestRecord[]>(`/maintenance-requests/by-asset/${id}`);
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const [assignOpen, setAssignOpen] = useState(false);
  const [sendToTechOpen, setSendToTechOpen] = useState(false);
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
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/assets" className="flex items-center hover:text-slate-700">
          <ChevronLeftIcon className="h-4 w-4" />
        </Link>
        <Link href="/assets" className="hover:text-slate-700">
          Assets
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">Asset Details</span>
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
              <MonitorIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">{asset.assetTag}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{asset.name}</p>
              {asset.category && (
                <span className="mt-2 inline-flex items-center rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-medium text-gold-dark">
                  {asset.category.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/maintenance/new?assetId=${asset.id}`}>
              <Button variant="outline-danger" size="sm">
                <AlertTriangleIcon className="h-4 w-4" />
                Report Fault
              </Button>
            </Link>
            {asset.status !== 'UNDER_MAINTENANCE' && (
              <RequirePermission permission="maintenance.resolve">
                <Button variant="secondary" size="sm" onClick={() => setSendToTechOpen(true)}>
                  Send to Technician
                </Button>
              </RequirePermission>
            )}
            <RequirePermission permission="assets.manage">
              <Link href={`/assets/${asset.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <PencilIcon className="h-4 w-4" />
                  Edit Asset
                </Button>
              </Link>
              {!asset.currentCustodianId && (
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  Assign to Staff
                </Button>
              )}
              {activeAssignment && (
                <Button variant="secondary" size="sm" onClick={onReturn}>
                  Return
                </Button>
              )}
              <Link href={`/asset-transfers/new?assetId=${asset.id}`}>
                <Button variant="secondary" size="sm">
                  Request Transfer
                </Button>
              </Link>
              <StatusPill status={asset.status} disabled={statusSubmitting} onChange={onStatusChange} />
            </RequirePermission>
          </div>
        </CardBody>
      </Card>

      {actionError && <ErrorAlert message={actionError} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>Details</CardHeader>
          <CardBody className="space-y-0.5">
            <IconDetailRow icon={<ListIcon className="h-4 w-4" />} label="Category" value={asset.category?.name ?? '—'} />
            <IconDetailRow
              icon={<TagIcon className="h-4 w-4" />}
              label="Brand / Model"
              value={[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}
            />
            {asset.description && (
              <IconDetailRow icon={<FileTextIcon className="h-4 w-4" />} label="Description" value={asset.description} />
            )}
            <IconDetailRow icon={<BarcodeIcon className="h-4 w-4" />} label="Serial number" value={asset.serialNumber ?? '—'} />
            <IconDetailRow icon={<ShieldIcon className="h-4 w-4" />} label="Condition">
              <DotPill label={asset.condition} tone={CONDITION_TONE[asset.condition] ?? 'neutral'} />
            </IconDetailRow>
            <IconDetailRow icon={<MapPinIcon className="h-4 w-4" />} label="Location" value={asset.currentLocation?.name ?? '—'} />
            <IconDetailRow icon={<UserIcon className="h-4 w-4" />} label="Custodian">
              {asset.currentCustodian ? (
                <span className="text-sm font-semibold text-slate-900">
                  {asset.currentCustodian.firstName} {asset.currentCustodian.lastName}
                </span>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </IconDetailRow>
            <IconDetailRow
              icon={<BanknoteIcon className="h-4 w-4" />}
              label="Purchase cost"
              value={asset.purchaseCost ? `₦${Number(asset.purchaseCost).toLocaleString()}` : '—'}
            />
            <IconDetailRow
              icon={<CalendarIcon className="h-4 w-4" />}
              label="Warranty ends"
              value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}
            />

            <RequirePermission permission="assets.manage">
              <div className={cn('mt-3 rounded-lg border p-3', PILL_TONE_CLASSES[ASSET_STATUS_TONE[asset.status]])}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-70">Status</p>
                <StatusPill status={asset.status} disabled={statusSubmitting} onChange={onStatusChange} />
              </div>
            </RequirePermission>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <FileClockIcon className="h-4 w-4 text-slate-400" />
            Assignment history
          </CardHeader>
          {!assignments || assignments.length === 0 ? (
            <RichEmptyState
              icon={<FileClockIcon className="h-7 w-7" />}
              title="No assignment history yet"
              subtitle="This asset has never been assigned."
            />
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
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PaperclipIcon className="h-4 w-4 text-slate-400" />
              Attachments
            </span>
          </CardHeader>
          <CardBody>
            {asset.attachments && asset.attachments.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {asset.attachments.map((att) => (
                  <li key={att.id}>
                    <a href={fileUrl(att.fileUrl)} target="_blank" rel="noreferrer" className="text-gold-dark hover:underline">
                      {att.label ?? att.fileUrl.split('/').pop()}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!(asset.attachments && asset.attachments.length > 0) && (
              <p className="mb-3 text-center text-xs text-slate-400">No documents or photos attached yet.</p>
            )}
            <RequirePermission permission="assets.manage">
              <AttachmentsDropzone onFile={onUpload} />
            </RequirePermission>
          </CardBody>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>Maintenance history</CardHeader>
          {!maintenanceHistory || maintenanceHistory.length === 0 ? (
            <EmptyState message="No maintenance or technician history for this asset." />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Reported</Th>
                  <Th>Fault / reason</Th>
                  <Th>Technician</Th>
                  <Th>Sent</Th>
                  <Th>Returned</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {maintenanceHistory.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Link href={`/maintenance/${m.id}`} className="text-gold-dark hover:underline">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </Link>
                    </Td>
                    <Td>{m.faultDescription}</Td>
                    <Td>{m.technician?.name ?? '—'}</Td>
                    <Td>{m.sentToTechnicianAt ? new Date(m.sentToTechnicianAt).toLocaleDateString() : '—'}</Td>
                    <Td>{m.resolvedAt ? new Date(m.resolvedAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <Badge tone={statusTone(m.status)}>{m.status === 'FULFILLED' ? 'RESOLVED' : m.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <QrLabelCard
          assetId={id}
          assetTag={asset.assetTag}
          assetName={asset.name}
          serialNumber={asset.serialNumber}
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

      <SendToTechnicianModal
        open={sendToTechOpen}
        assetId={id}
        onClose={() => setSendToTechOpen(false)}
        onSent={() => {
          setSendToTechOpen(false);
          refetch();
          refetchMaintenance();
        }}
      />
    </div>
  );
}

const PILL_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

/** A small rounded, bordered pill with a leading dot — read-only display of a status-like value
 *  (e.g. asset condition), visually distinct from the clickable StatusPill below. */
function DotPill({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', PILL_TONE_CLASSES[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Looks like DotPill plus a chevron, but a native <select> is overlaid transparently on top so
 *  it stays a real, accessible, keyboard-operable dropdown — just visually styled as a pill
 *  instead of a standard boxy <select>. */
function StatusPill({
  status,
  disabled,
  onChange,
}: {
  status: AssetStatus;
  disabled?: boolean;
  onChange: (status: AssetStatus) => void;
}) {
  const tone = ASSET_STATUS_TONE[status];
  return (
    <span
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
        PILL_TONE_CLASSES[tone],
        disabled && 'opacity-60',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace('_', ' ')}
      <ChevronDownIcon className="h-3.5 w-3.5" />
      <select
        aria-label="Change asset status"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        value={status}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as AssetStatus)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
    </span>
  );
}

function IconDetailRow({ icon, label, value, children }: { icon: ReactNode; label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      {children ?? <span className="text-sm font-semibold text-slate-900">{value}</span>}
    </div>
  );
}

/** A richer empty state than the shared, single-line EmptyState: a circular icon illustration
 *  plus a bold title and a muted subtitle — used where the illustration adds real context
 *  (e.g. "this asset has never been assigned") rather than being purely decorative. */
function RichEmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-navy/30">{icon}</div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function AttachmentsDropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
        dragOver ? 'border-gold bg-gold-light/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <UploadCloudIcon className="h-8 w-8 text-slate-400" />
      <p className="text-sm font-medium text-slate-600">Choose files or drag and drop here</p>
      <p className="text-xs text-slate-400">PDF, JPG, PNG, DOC, DOCX (Max 10MB each)</p>
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function QrLabelCard({
  assetId,
  assetTag,
  assetName,
  serialNumber,
  qrCodeEnabled,
}: {
  assetId: string;
  assetTag: string;
  assetName: string;
  serialNumber: string | null;
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
      <CardHeader className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-slate-400" />
        Asset Label
      </CardHeader>
      <CardBody>
        <div className="flex items-center gap-3 rounded-lg bg-gold-light/40 p-3">
          {qrCodeEnabled &&
            (imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={`QR code for ${assetTag}`} width={56} height={56} className="shrink-0 rounded bg-white p-1" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-white text-[10px] text-slate-400">
                Loading…
              </div>
            ))}
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{assetTag}</p>
            <p className="truncate text-xs text-slate-500">{assetName}</p>
            {serialNumber && <p className="truncate text-xs text-slate-400">S/N: {serialNumber}</p>}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print flex-1">
            <PrinterIcon className="h-4 w-4" />
            Print Label
          </Button>
          {imageUrl && (
            <a href={imageUrl} download={`${assetTag}-label.png`} className="no-print flex-1">
              <Button size="sm" className="w-full">
                <DownloadIcon className="h-4 w-4" />
                Download
              </Button>
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function DepreciationCard({ asset }: { asset: Asset }) {
  const d = asset.depreciation;
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <BarChart3Icon className="h-4 w-4 text-slate-400" />
        Depreciation
      </CardHeader>
      {d ? (
        <CardBody className="space-y-0.5">
          <IconDetailRow icon={<ListIcon className="h-4 w-4" />} label="Method" value={d.method.replace('_', ' ')} />
          <IconDetailRow icon={<CalendarIcon className="h-4 w-4" />} label="Months elapsed" value={String(d.monthsElapsed)} />
          <IconDetailRow
            icon={<BanknoteIcon className="h-4 w-4" />}
            label="Accumulated depreciation"
            value={`₦${Number(d.accumulatedDepreciation).toLocaleString()}`}
          />
          <IconDetailRow
            icon={<BanknoteIcon className="h-4 w-4" />}
            label="Net book value"
            value={`₦${Number(d.netBookValue).toLocaleString()}`}
          />
        </CardBody>
      ) : (
        <RichEmptyState
          icon={<BarChart3Icon className="h-7 w-7" />}
          title="Not enough data to calculate depreciation."
          subtitle="Purchase cost, purchase date, and useful life or a rate are required."
        />
      )}
    </Card>
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
  const { data: staffPage } = useApi<Paginated<CurrentUser>>(open ? '/users' : null, { branchId, pageSize: 1000 });
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
          <Label htmlFor="staff" required>Staff member</Label>
          <Select id="staff" required value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Select staff</option>
            {(staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}{s.staffNumber ? ` (${s.staffNumber})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

function SendToTechnicianModal({
  open,
  assetId,
  onClose,
  onSent,
}: {
  open: boolean;
  assetId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { data: techniciansPage } = useApi<Paginated<Technician>>(open ? '/technicians' : null, { pageSize: 1000 });
  const technicians = (techniciansPage?.items ?? []).filter((t) => t.isActive);
  const [technicianId, setTechnicianId] = useState('');
  const [reason, setReason] = useState('');
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
      await api.post('/maintenance-requests/send-to-technician', { assetId, technicianId, reason });
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send to technician');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send to Technician">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="sendTechnicianId" required>Technician</Label>
          <Select id="sendTechnicianId" required value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">Select technician</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="sendReason" required>Reason</Label>
          <Textarea
            id="sendReason"
            rows={2}
            required
            placeholder="e.g. Routine servicing, screen replacement…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !technicianId || !reason}>
            {submitting ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
