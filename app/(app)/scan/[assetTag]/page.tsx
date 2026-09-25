'use client';

import { use, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type {
  Asset,
  AssetCondition,
  AssetStatus,
  DisplaySettingsRecord,
  DiscrepancyType,
  LocationNode,
  Paginated,
  Staff,
  VerificationScanRecord,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Label, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';

const CONDITIONS: AssetCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const STATUSES: AssetStatus[] = ['IN_STORE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST'];
const DISCREPANCY_OVERRIDES: DiscrepancyType[] = ['NOT_FOUND', 'DAMAGED', 'UNLABELLED', 'DUPLICATE_TAG'];

interface LookupResult {
  asset: Asset;
  scan: (VerificationScanRecord & { campaign: { id: string; name: string; status: string } }) | null;
}

export default function ScanAssetPage({ params }: { params: Promise<{ assetTag: string }> }) {
  const { assetTag } = use(params);
  const { data: displaySettings, loading: settingsLoading } = useApi<DisplaySettingsRecord>('/settings/display');
  const { data, loading, error, refetch } = useApi<LookupResult>(`/verify/lookup/${encodeURIComponent(assetTag)}`);

  if (settingsLoading || loading) return <PageLoading />;
  if (!displaySettings?.scanEnabled) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-500">Asset scanning has not been enabled by your administrator.</p>
        </CardBody>
      </Card>
    );
  }
  if (error || !data) return <ErrorAlert message={error ?? 'Asset not found'} />;

  const { asset, scan } = data;

  return (
    <div className="max-w-xl">
      <PageHeader title={asset.name} description={`Asset tag: ${asset.assetTag}`} />

      <Card>
        <CardHeader>System record</CardHeader>
        <CardBody className="space-y-2 text-sm">
          <Row label="Location" value={asset.currentLocation?.name ?? '—'} />
          <Row label="Custodian" value={asset.currentCustodian ? `${asset.currentCustodian.firstName} ${asset.currentCustodian.lastName}` : 'Unassigned'} />
          <Row label="Condition" value={asset.condition} />
          <Row label="Status" value={asset.status} />
        </CardBody>
      </Card>

      <div className="mt-4">
        {!scan ? (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                No active verification campaign includes this asset right now.{' '}
                <Link href={`/assets/${asset.id}`} className="text-gold-dark hover:underline">
                  View asset details
                </Link>
                .
              </p>
            </CardBody>
          </Card>
        ) : (
          <ScanForm asset={asset} scan={scan} onSubmitted={refetch} />
        )}
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

function ScanForm({
  asset,
  scan,
  onSubmitted,
}: {
  asset: Asset;
  scan: VerificationScanRecord & { campaign: { id: string; name: string; status: string } };
  onSubmitted: () => void;
}) {
  const { data: staffPage } = useApi<Paginated<Staff>>('/staff', { branchId: asset.branchId, pageSize: 1000 });
  const staff = staffPage?.items;

  const [observedLocationId, setObservedLocationId] = useState(asset.currentLocationId);
  const [observedCustodianId, setObservedCustodianId] = useState(asset.currentCustodianId ?? '');
  const [observedCondition, setObservedCondition] = useState<AssetCondition>(asset.condition);
  const [observedStatus, setObservedStatus] = useState<AssetStatus>(asset.status);
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyType | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/verification-campaigns/${scan.campaignId}/scans/${asset.id}`, {
        observedLocationId,
        observedCustodianId: observedCustodianId || undefined,
        observedCondition,
        observedStatus,
        discrepancyType: discrepancyType || undefined,
        notes: notes || undefined,
      });
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm font-medium text-emerald-600">Verification recorded. Thank you.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        Verify for: {scan.campaign.name}
        {scan.outcome !== 'PENDING' && (
          <span className="ml-2">
            <Badge tone={scan.outcome === 'VERIFIED_OK' ? 'green' : 'red'}>Already scanned: {scan.outcome}</Badge>
          </span>
        )}
      </CardHeader>
      <CardBody>
        {error && <ErrorAlert message={error} />}
        <form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="observedLocation">Observed location</Label>
            <AssetLocationSelect branchId={asset.branchId} value={observedLocationId} onChange={setObservedLocationId} />
          </Field>

          <Field>
            <Label htmlFor="observedCustodian">Observed custodian</Label>
            <Select id="observedCustodian" value={observedCustodianId} onChange={(e) => setObservedCustodianId(e.target.value)}>
              <option value="">None / not with a staff member</option>
              {(staff ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <Label htmlFor="observedCondition">Observed condition</Label>
              <Select id="observedCondition" value={observedCondition} onChange={(e) => setObservedCondition(e.target.value as AssetCondition)}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="observedStatus">Observed status</Label>
              <Select id="observedStatus" value={observedStatus} onChange={(e) => setObservedStatus(e.target.value as AssetStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field>
            <Label htmlFor="discrepancyType">Report a specific issue (optional)</Label>
            <Select id="discrepancyType" value={discrepancyType} onChange={(e) => setDiscrepancyType(e.target.value as DiscrepancyType)}>
              <option value="">None — use location/custodian comparison</option>
              {DISCREPANCY_OVERRIDES.map((d) => (
                <option key={d} value={d}>
                  {d.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting…' : 'Submit Verification'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function AssetLocationSelect({ branchId, value, onChange }: { branchId: string; value: string; onChange: (v: string) => void }) {
  const { data: locationsPage } = useApi<Paginated<LocationNode>>('/locations', { branchId, pageSize: 1000 });
  const locations = locationsPage?.items;
  return (
    <Select id="observedLocation" value={value} onChange={(e) => onChange(e.target.value)}>
      {(locations ?? []).map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} ({l.type})
        </option>
      ))}
    </Select>
  );
}
