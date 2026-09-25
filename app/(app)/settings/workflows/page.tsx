'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { ApprovalWorkflowStep, Role, WorkflowEntityType } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

const ENTITY_TYPES: { key: WorkflowEntityType; label: string; description: string }[] = [
  { key: 'ASSET_REQUEST', label: 'Asset Requests', description: 'New asset requests from staff.' },
  { key: 'INVENTORY_REQUEST', label: 'Inventory Requests', description: 'Consumable inventory requests from staff.' },
  { key: 'EQUIPMENT_LOAN', label: 'Equipment Loans', description: 'Temporary equipment loan requests.' },
  { key: 'ASSET_TRANSFER', label: 'Asset Transfers', description: 'Moving an asset between locations.' },
  { key: 'INVENTORY_TRANSFER', label: 'Inventory Transfers', description: 'Moving stock between stores.' },
];

const ROLES: Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTODIAN', 'APPROVER', 'AUDITOR', 'HOD'];

export default function WorkflowSettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Approval Workflows"
        description="Define, per request type, the ordered sequence of roles required to approve it. An empty sequence means new submissions are auto-approved immediately."
      />
      <div className="space-y-4">
        {ENTITY_TYPES.map((e) => (
          <WorkflowEditor key={e.key} entityType={e.key} label={e.label} description={e.description} />
        ))}
      </div>
    </div>
  );
}

function WorkflowEditor({ entityType, label, description }: { entityType: WorkflowEntityType; label: string; description: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    let cancelled = false;
    api
      .get<ApprovalWorkflowStep[]>(`/workflow-steps/${entityType}`)
      .then((steps) => {
        if (!cancelled) setRoles(steps.sort((a, b) => a.stepOrder - b.stepOrder).map((s) => s.requiredRole));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load workflow');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  function move(index: number, direction: -1 | 1) {
    const next = [...roles];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRoles(next);
    setSaved(false);
  }

  function remove(index: number) {
    setRoles(roles.filter((_, i) => i !== index));
    setSaved(false);
  }

  function addRole(role: Role) {
    setRoles([...roles, role]);
    setSaved(false);
  }

  async function save() {
    const ok = await confirm({ title: `Save the ${label} workflow?`, message: 'This changes the approval chain for future submissions.' });
    if (!ok) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.put(`/workflow-steps/${entityType}`, { roles });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-xs font-normal text-slate-500">{description}</p>
      </CardHeader>
      <CardBody>
        {error && <ErrorAlert message={error} />}
        {loading ? (
          <PageLoading />
        ) : (
          <>
            {roles.length === 0 ? (
              <p className="mb-3 text-sm text-slate-400">No approval steps configured — submissions auto-approve.</p>
            ) : (
              <ol className="mb-3 space-y-2">
                {roles.map((role, index) => (
                  <li key={index} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-400">Step {index + 1}</span>
                    <span className="flex-1 text-sm font-medium text-slate-900">{role.replace('_', ' ')}</span>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === roles.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex items-center gap-2">
              <Select
                className="max-w-xs"
                value=""
                onChange={(e) => {
                  if (e.target.value) addRole(e.target.value as Role);
                }}
              >
                <option value="">+ Add approval step…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </Select>
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {saved && <span className="text-xs text-emerald-600">Saved</span>}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
