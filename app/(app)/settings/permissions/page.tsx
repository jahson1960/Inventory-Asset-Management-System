'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import type { PermissionRules, Role } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

const ROLE_COLUMNS: Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTODIAN', 'STAFF', 'AUDITOR', 'APPROVER', 'HOD'];

const ACTION_KEYS: { key: string; label: string }[] = [
  { key: 'assets.manage', label: 'Manage assets (create/edit/status/attachments)' },
  { key: 'assetCategories.manage', label: 'Manage asset categories' },
  { key: 'inventoryCategories.manage', label: 'Manage inventory categories' },
  { key: 'unitsOfMeasure.manage', label: 'Manage units of measure' },
  { key: 'suppliers.manage', label: 'Manage suppliers' },
  { key: 'branches.manage', label: 'Manage branches' },
  { key: 'departments.manage', label: 'Manage departments' },
  { key: 'locations.manage', label: 'Manage locations' },
  { key: 'staff.manage', label: 'Manage staff' },
  { key: 'inventoryItems.manage', label: 'Manage inventory items' },
  { key: 'stock.manage', label: 'Manage stock (receipts/adjustments/opening balance)' },
  { key: 'issuance.create', label: 'Issue inventory' },
  { key: 'assignments.manage', label: 'Manage asset assignments (assign/return)' },
  { key: 'assetRequests.fulfill', label: 'Fulfill asset requests' },
  { key: 'inventoryRequests.fulfill', label: 'Fulfill inventory requests' },
  { key: 'loans.issue', label: 'Issue equipment loans' },
  { key: 'assetTransfers.create', label: 'Create/acknowledge asset transfers' },
  { key: 'inventoryTransfers.create', label: 'Create inventory transfers' },
  { key: 'maintenance.resolve', label: 'Resolve maintenance requests' },
  { key: 'verification.manage', label: 'Create/cancel verification campaigns' },
  { key: 'verification.scan', label: 'Submit verification scans' },
  { key: 'stockCounts.manage', label: 'Manage stock count sessions' },
  { key: 'users.manage', label: 'Manage users' },
  { key: 'auditLog.view', label: 'View audit log' },
  { key: 'workflowSteps.edit', label: 'Edit approval workflow steps' },
  { key: 'settings.smtp', label: 'Manage email (SMTP) settings' },
  { key: 'settings.write', label: 'Manage other settings (depreciation/display/theme)' },
];

const NAV_KEYS: { key: string; label: string }[] = [
  { key: 'nav.verification', label: 'Verification Campaigns' },
  { key: 'nav.stockCounts', label: 'Stock Counts' },
  { key: 'nav.staff', label: 'Staff' },
  { key: 'nav.branches', label: 'Branches' },
  { key: 'nav.departments', label: 'Departments' },
  { key: 'nav.locations', label: 'Locations' },
  { key: 'nav.assetCategories', label: 'Asset Categories' },
  { key: 'nav.inventoryCategories', label: 'Inventory Categories' },
  { key: 'nav.unitsOfMeasure', label: 'Units of Measure' },
  { key: 'nav.suppliers', label: 'Suppliers' },
  { key: 'nav.users', label: 'Users' },
  { key: 'nav.auditLog', label: 'Audit Log' },
  { key: 'nav.settingsWorkflows', label: 'Settings → Approval Workflows' },
  { key: 'nav.settingsEmail', label: 'Settings → Email (SMTP)' },
  { key: 'nav.settingsEmailTemplates', label: 'Settings → Email Templates' },
  { key: 'nav.settingsDepreciation', label: 'Settings → Depreciation' },
  { key: 'nav.settingsDisplay', label: 'Settings → Display' },
];

export default function PermissionsSettingsPage() {
  const { data, loading, error: loadError } = useApi<PermissionRules>('/permissions');

  if (loading) return <PageLoading />;

  return (
    <div>
      {loadError && <ErrorAlert message={loadError} />}
      <PermissionsForm rules={data ?? {}} />
    </div>
  );
}

function PermissionsForm({ rules: initialRules }: { rules: PermissionRules }) {
  const { refreshPermissions } = useAuth();
  const [rules, setRules] = useState<PermissionRules>(initialRules);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function toggle(key: string, role: Role) {
    if (role === 'SUPER_ADMIN') return;
    setRules((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [key]: next };
    });
    setSaved(false);
  }

  async function onSave() {
    const ok = await confirm({
      title: 'Save role permissions?',
      message: 'This changes who can perform these actions and see these pages, effective immediately for everyone.',
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/permissions', { updates: rules });
      await refreshPermissions();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Control which roles can perform each action or see each page. Super Admin always has full access and cannot be restricted."
        action={
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {saved && <span className="text-xs text-emerald-600">Saved</span>}
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="space-y-6">
        <PermissionTable title="Actions" rows={ACTION_KEYS} rules={rules} onToggle={toggle} />
        <PermissionTable title="Page visibility" rows={NAV_KEYS} rules={rules} onToggle={toggle} />
      </div>
    </div>
  );
}

function PermissionTable({
  title,
  rows,
  rules,
  onToggle,
}: {
  title: string;
  rows: { key: string; label: string }[];
  rules: PermissionRules;
  onToggle: (key: string, role: Role) => void;
}) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <Table>
        <Thead>
          <Tr>
            <Th>Permission</Th>
            {ROLE_COLUMNS.map((role) => (
              <Th key={role} className="text-center">
                {role.replace('_', ' ')}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.key}>
              <Td className="font-medium text-slate-900">{row.label}</Td>
              {ROLE_COLUMNS.map((role) => (
                <Td key={role} className="text-center">
                  <input
                    type="checkbox"
                    checked={role === 'SUPER_ADMIN' || (rules[row.key]?.includes(role) ?? false)}
                    disabled={role === 'SUPER_ADMIN'}
                    onChange={() => onToggle(row.key, role)}
                  />
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  );
}
