'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { StockCountLineRecord, StockCountSessionRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { statusTone } from '@/lib/status-tone';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function StockCountSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, loading, error, refetch } = useApi<StockCountSessionRecord>(`/stock-count-sessions/${id}`);
  const [actionError, setActionError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const confirm = useConfirm();

  if (loading) return <PageLoading />;
  if (error || !session) return <ErrorAlert message={error ?? 'Session not found'} />;

  const linesWithVariance = (session.lines ?? []).filter((l) => l.variance !== null && Number(l.variance) !== 0);
  const unpostedVariances = linesWithVariance.filter((l) => !l.adjustmentMovementId);

  async function postAdjustments() {
    const ok = await confirm({
      title: `Post ${unpostedVariances.length} adjustment${unpostedVariances.length === 1 ? '' : 's'}?`,
      message: 'Stock balances will be updated to match the counted quantities.',
    });
    if (!ok) return;
    setPosting(true);
    setActionError(null);
    try {
      await api.post(`/stock-count-sessions/${id}/post-adjustments`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to post adjustments');
    } finally {
      setPosting(false);
    }
  }

  async function complete() {
    const ok = await confirm({ title: 'Complete this session?', message: 'No further counts can be recorded after this.' });
    if (!ok) return;
    setCompleting(true);
    setActionError(null);
    try {
      await api.post(`/stock-count-sessions/${id}/complete`, {});
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={session.name}
        description={session.location?.name ?? ''}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(session.status)}>{session.status}</Badge>
            {session.status === 'ACTIVE' && (
              <RequirePermission permission="stockCounts.manage">
                {unpostedVariances.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={postAdjustments} disabled={posting}>
                    {posting ? 'Posting…' : `Post ${unpostedVariances.length} Adjustment${unpostedVariances.length === 1 ? '' : 's'}`}
                  </Button>
                )}
                <Button size="sm" onClick={complete} disabled={completing}>
                  {completing ? 'Completing…' : 'Complete Session'}
                </Button>
              </RequirePermission>
            )}
          </div>
        }
      />

      {actionError && <ErrorAlert message={actionError} />}

      <Card>
        {!session.lines || session.lines.length === 0 ? (
          <EmptyState message="No items to count." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Item</Th>
                <Th>System qty</Th>
                <Th>Physical qty</Th>
                <Th>Variance</Th>
                <Th>Adjustment</Th>
              </Tr>
            </Thead>
            <Tbody>
              {session.lines.map((line) => (
                <CountLineRow key={line.id} sessionId={id} line={line} readOnly={session.status !== 'ACTIVE'} onSaved={refetch} />
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function CountLineRow({
  sessionId,
  line,
  readOnly,
  onSaved,
}: {
  sessionId: string;
  line: StockCountLineRecord;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(line.physicalQuantity ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === '' || Number(value) === Number(line.physicalQuantity ?? NaN)) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/stock-count-sessions/${sessionId}/lines/${line.itemId}`, { physicalQuantity: Number(value) });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save count');
    } finally {
      setSaving(false);
    }
  }

  const variance = line.variance !== null ? Number(line.variance) : null;

  return (
    <Tr>
      <Td className="font-medium text-slate-900">{line.item?.name ?? line.itemId}</Td>
      <Td>
        {line.systemQuantity} {line.item?.baseUnit?.code}
      </Td>
      <Td>
        {readOnly ? (
          <span>
            {line.physicalQuantity ?? '—'} {line.item?.baseUnit?.code}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={save}
              className="w-28"
              disabled={saving}
            />
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        )}
      </Td>
      <Td>
        {variance === null ? (
          '—'
        ) : (
          <Badge tone={variance === 0 ? 'green' : 'amber'}>{variance > 0 ? `+${variance}` : variance}</Badge>
        )}
      </Td>
      <Td>{line.adjustmentMovementId ? <Badge tone="green">Posted</Badge> : variance ? 'Pending' : '—'}</Td>
    </Tr>
  );
}
