'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { VerificationCampaignRecord, VerificationScanRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function VerificationCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: campaign, loading, error, refetch } = useApi<VerificationCampaignRecord>(`/verification-campaigns/${id}`);
  const { data: scans, refetch: refetchScans } = useApi<VerificationScanRecord[]>(`/verification-campaigns/${id}/scans`);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const confirm = useConfirm();

  if (loading) return <PageLoading />;
  if (error || !campaign) return <ErrorAlert message={error ?? 'Campaign not found'} />;

  async function cancel() {
    const ok = await confirm({ title: 'Cancel this campaign?', message: 'This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    setCancelling(true);
    setActionError(null);
    try {
      await api.post(`/verification-campaigns/${id}/cancel`, {});
      refetch();
      refetchScans();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel campaign');
    } finally {
      setCancelling(false);
    }
  }

  const stats = campaign.stats ?? { total: 0, verifiedOk: 0, discrepancy: 0, pending: 0 };
  const completionPct = stats.total === 0 ? 0 : Math.round(((stats.total - stats.pending) / stats.total) * 100);

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={`${campaign.branch?.name ?? ''}${campaign.location ? ` — ${campaign.location.name}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
            {campaign.status === 'ACTIVE' && (
              <RequirePermission permission="verification.manage">
                <Button variant="secondary" size="sm" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel Campaign'}
                </Button>
              </RequirePermission>
            )}
          </div>
        }
      />

      {actionError && <ErrorAlert message={actionError} />}

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Completion" value={`${completionPct}%`} />
        <StatTile label="Verified OK" value={stats.verifiedOk} tone="green" />
        <StatTile label="Discrepancies" value={stats.discrepancy} tone="red" />
        <StatTile label="Pending" value={stats.pending} tone="amber" />
      </div>

      <Card>
        {!scans || scans.length === 0 ? (
          <EmptyState message="No assets in scope." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Asset</Th>
                <Th>Outcome</Th>
                <Th>Discrepancy</Th>
                <Th>Scanned by</Th>
                <Th>Scanned at</Th>
              </Tr>
            </Thead>
            <Tbody>
              {scans.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-slate-900">
                    <Link href={`/assets/${s.assetId}`} className="hover:underline">
                      {s.asset?.assetTag} — {s.asset?.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={s.outcome === 'VERIFIED_OK' ? 'green' : s.outcome === 'DISCREPANCY' ? 'red' : 'amber'}>
                      {s.outcome}
                    </Badge>
                  </Td>
                  <Td>{s.discrepancyType !== 'NONE' ? s.discrepancyType.replace('_', ' ') : '—'}</Td>
                  <Td>{s.scannedBy ? `${s.scannedBy.firstName} ${s.scannedBy.lastName}` : '—'}</Td>
                  <Td>{s.scannedAt ? new Date(s.scannedAt).toLocaleString() : '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: 'green' | 'red' | 'amber' }) {
  const valueClass = tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
