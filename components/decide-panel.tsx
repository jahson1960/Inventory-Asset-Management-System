'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function DecidePanel({ decidePath, onDecided }: { decidePath: string; onDecided: () => void }) {
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const confirm = useConfirm();

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    const ok = await confirm({
      title: decision === 'APPROVED' ? 'Approve this?' : 'Reject this?',
      message: decision === 'APPROVED' ? 'It will move to the next step (or be finalized).' : 'The requester will be notified.',
      tone: decision === 'REJECTED' ? 'danger' : 'default',
      confirmLabel: decision === 'APPROVED' ? 'Approve' : 'Reject',
    });
    if (!ok) return;
    setSubmitting(decision);
    setError(null);
    try {
      await api.post(decidePath, { decision, comments: comments || undefined });
      onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record decision');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-900">Your decision is required at this step</p>
      {error && <ErrorAlert message={error} />}
      <Textarea
        placeholder="Comments (optional)"
        rows={2}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className="mb-3 bg-white"
      />
      <div className="flex gap-2">
        <Button onClick={() => decide('APPROVED')} disabled={submitting !== null}>
          {submitting === 'APPROVED' ? 'Approving…' : 'Approve'}
        </Button>
        <Button variant="danger" onClick={() => decide('REJECTED')} disabled={submitting !== null}>
          {submitting === 'REJECTED' ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
