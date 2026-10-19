'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { usePaginatedApi } from '@/hooks/use-paginated-api';
import { api, ApiError } from '@/lib/api-client';
import type { AssetCategory, DisplaySettingsRecord, InventoryCategory, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { RequirePermission } from '@/components/require-permission';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

type Category = AssetCategory | InventoryCategory;

export function CategoryManager({
  resourcePath,
  title,
  description,
  permission,
}: {
  resourcePath: string;
  title: string;
  description: string;
  permission: string;
}) {
  // Auto-generated asset tags only apply to asset categories, not inventory ones — inventory
  // items are catalog/product entries (itemCode is admin-typed, not per-unit), so there's
  // nothing analogous to auto-number there.
  const isAssetCategory = resourcePath === '/asset-categories';
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const pageSize = displaySettings?.pageSize ?? 25;
  const { items: categories, total, page, setPage, totalPages, loading, error, refetch } = usePaginatedApi<Category>(
    resourcePath,
    pageSize,
  );
  const { data: allCategoriesPage } = useApi<Paginated<Category>>(resourcePath, { pageSize: 1000 });
  const allCategories = allCategoriesPage?.items;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const nameById = new Map((allCategories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <RequirePermission permission={permission}>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New Category
            </Button>
          </RequirePermission>
        }
      />

      <Card>
        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState message="No categories yet." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Code</Th>
                {isAssetCategory && <Th>Tag Code</Th>}
                <Th>Parent</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {categories.map((cat) => (
                <Tr key={cat.id}>
                  <Td className="font-medium text-slate-900">{cat.name}</Td>
                  <Td>{cat.code}</Td>
                  {isAssetCategory && <Td>{(cat as AssetCategory).tagCode ?? '—'}</Td>}
                  <Td>{cat.parentId ? (nameById.get(cat.parentId) ?? '—') : '—'}</Td>
                  <Td>
                    <Badge tone={cat.isActive ? 'green' : 'neutral'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td>
                    <RequirePermission permission={permission}>
                      <button
                        onClick={() => {
                          setEditing(cat);
                          setModalOpen(true);
                        }}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                    </RequirePermission>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <CategoryFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        category={editing}
        categories={allCategories ?? []}
        resourcePath={resourcePath}
        isAssetCategory={isAssetCategory}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function CategoryFormModal({
  open,
  category,
  categories,
  resourcePath,
  isAssetCategory,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  categories: Category[];
  resourcePath: string;
  isAssetCategory: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [code, setCode] = useState(category?.code ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [tagCode, setTagCode] = useState((category as AssetCategory | null)?.tagCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const parentOptions = categories.filter((c) => c.id !== category?.id);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: category ? 'Save changes to this category?' : 'Create this category?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, code, description: description || undefined };
      if (category) {
        // Editing: an explicit null clears tagCode (dropping back to manual asset-tag entry for
        // this category) — omitting the key here would leave the previous value untouched.
        await api.patch(`${resourcePath}/${category.id}`, {
          ...payload,
          ...(isAssetCategory ? { tagCode: tagCode.trim() || null } : {}),
        });
      } else {
        await api.post(resourcePath, {
          ...payload,
          parentId: parentId || undefined,
          ...(isAssetCategory ? { tagCode: tagCode.trim() || undefined } : {}),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Edit Category' : 'New Category'}>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={onSubmit}>
        {!category && (
          <Field>
            <Label htmlFor="parent">Parent category</Label>
            <Select id="parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (top level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="code" required>Code</Label>
          <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        {isAssetCategory && (
          <Field>
            <Label htmlFor="tagCode">Tag code (for auto-generated asset tags)</Label>
            <Input
              id="tagCode"
              placeholder="e.g. LAP"
              value={tagCode}
              onChange={(e) => setTagCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <p className="mt-1 text-xs text-slate-400">
              Assets created under this category get an auto-generated tag (e.g. RBSN-{tagCode || 'LAP'}-0001) instead of a
              typed one. Leave blank to require a manually-typed tag for this category.
            </p>
          </Field>
        )}
        <Field>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
