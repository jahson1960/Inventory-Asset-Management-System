'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { AssetCategory, InventoryCategory } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function QuickCreateCategoryModal({
  kind,
  open,
  onClose,
  onCreated,
}: {
  kind: 'asset' | 'inventory';
  open: boolean;
  onClose: () => void;
  onCreated: (category: AssetCategory | InventoryCategory) => void;
}) {
  const endpoint = kind === 'asset' ? '/asset-categories' : '/inventory-categories';
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Create this category?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const category = await api.post<AssetCategory | InventoryCategory>(endpoint, { name, code });
      setName('');
      setCode('');
      onCreated(category);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Category">
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="quickCategoryName">Name</Label>
          <Input id="quickCategoryName" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="quickCategoryCode">Code</Label>
          <Input id="quickCategoryCode" required value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
