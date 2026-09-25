'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError, uploadFile } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { applyTheme, brandLogoUrl, DEFAULT_THEME, type ColorKey } from '@/lib/theme';
import { CARD_VIEW_LISTS } from '@/lib/list-keys';
import { ASSET_REQUIRED_FIELD_OPTIONS } from '@/lib/asset-required-fields';
import type { DisplaySettingsRecord, Role, ThemeSettingsRecord } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/cn';

const ROLES: Role[] = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTODIAN', 'STAFF', 'AUDITOR', 'APPROVER', 'HOD'];

const COLOR_GROUPS: { title: string; fields: { key: ColorKey; label: string }[] }[] = [
  {
    title: 'Sidebar',
    fields: [
      { key: 'navy', label: 'Navy' },
      { key: 'navyDark', label: 'Navy (dark)' },
    ],
  },
  {
    title: 'Accent',
    fields: [
      { key: 'gold', label: 'Gold' },
      { key: 'goldDark', label: 'Gold (dark)' },
      { key: 'goldLight', label: 'Gold (light)' },
    ],
  },
  {
    title: 'Background',
    fields: [
      { key: 'cream', label: 'Cream' },
      { key: 'creamDark', label: 'Cream (dark)' },
    ],
  },
];

export default function DisplaySettingsPage() {
  const [tab, setTab] = useState<'display' | 'theme'>('display');
  const { data: displaySettings, loading: displayLoading, refetch: refetchDisplay } = useApi<DisplaySettingsRecord>('/settings/display');
  const { data: themeSettings, loading: themeLoading, refetch: refetchTheme } = useApi<ThemeSettingsRecord>('/settings/theme');

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Display"
        description="Control list appearance, purchase cost visibility, the color palette, and branding."
      />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === 'display'} onClick={() => setTab('display')}>
          Display
        </TabButton>
        <TabButton active={tab === 'theme'} onClick={() => setTab('theme')}>
          Theme
        </TabButton>
      </div>

      {tab === 'display' ? (
        displayLoading ? (
          <PageLoading />
        ) : (
          <Card>
            <CardBody>
              <DisplayForm settings={displaySettings} onSaved={refetchDisplay} />
            </CardBody>
          </Card>
        )
      ) : themeLoading ? (
        <PageLoading />
      ) : (
        <ThemeSection
          settings={themeSettings}
          onSaved={refetchTheme}
          maxLogoSizeKb={displaySettings?.maxLogoSizeKb ?? 2048}
          maxFaviconSizeKb={displaySettings?.maxFaviconSizeKb ?? 512}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
        active ? 'border-gold text-gold-dark' : 'border-transparent text-slate-500 hover:text-slate-700',
      )}
    >
      {children}
    </button>
  );
}

function DisplayForm({ settings, onSaved }: { settings?: DisplaySettingsRecord; onSaved: () => void }) {
  const [visibleRoles, setVisibleRoles] = useState<Role[]>(settings?.purchaseCostVisibleRoles ?? ['SUPER_ADMIN', 'BRANCH_ADMIN']);
  const [requiredFields, setRequiredFields] = useState<string[]>(settings?.assetRequiredFields ?? []);
  const [estimatedCostVisibleRoles, setEstimatedCostVisibleRoles] = useState<Role[]>(settings?.estimatedCostVisibleRoles ?? ROLES);
  const [estimatedCostEnabled, setEstimatedCostEnabled] = useState(settings?.estimatedCostEnabled ?? false);
  const [signatureRequired, setSignatureRequired] = useState(settings?.signatureRequired ?? false);
  const [cardViewLists, setCardViewLists] = useState<string[]>(settings?.cardViewLists ?? []);
  const [pageSize, setPageSize] = useState(settings?.pageSize ?? 25);
  const [scanEnabled, setScanEnabled] = useState(settings?.scanEnabled ?? false);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(settings?.qrCodeEnabled ?? false);
  const [inlineCreateEnabled, setInlineCreateEnabled] = useState(settings?.inlineCreateEnabled ?? true);
  const [maxLogoSizeKb, setMaxLogoSizeKb] = useState(settings?.maxLogoSizeKb ?? 2048);
  const [maxFaviconSizeKb, setMaxFaviconSizeKb] = useState(settings?.maxFaviconSizeKb ?? 512);
  const [maxSignatureSizeKb, setMaxSignatureSizeKb] = useState(settings?.maxSignatureSizeKb ?? 2048);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function toggleRole(role: Role) {
    setVisibleRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function toggleEstimatedCostRole(role: Role) {
    setEstimatedCostVisibleRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function toggleRequiredField(key: string) {
    setRequiredFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleCardView(key: string) {
    setCardViewLists((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save these display settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/display', {
        purchaseCostVisibleRoles: visibleRoles,
        assetRequiredFields: requiredFields,
        estimatedCostVisibleRoles,
        estimatedCostEnabled,
        signatureRequired,
        cardViewLists,
        pageSize,
        scanEnabled,
        qrCodeEnabled,
        inlineCreateEnabled,
        maxLogoSizeKb,
        maxFaviconSizeKb,
        maxSignatureSizeKb,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save display settings');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}

      <Field>
        <Label>Purchase cost visible to</Label>
        <div className="space-y-1.5">
          {ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={visibleRoles.includes(role)} onChange={() => toggleRole(role)} />
              {role.replace('_', ' ')}
            </label>
          ))}
        </div>
      </Field>

      <Field>
        <Label>Required fields when creating an asset</Label>
        <div className="space-y-1.5">
          {ASSET_REQUIRED_FIELD_OPTIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={requiredFields.includes(key)} onChange={() => toggleRequiredField(key)} />
              {label}
            </label>
          ))}
        </div>
      </Field>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={estimatedCostEnabled} onChange={(e) => setEstimatedCostEnabled(e.target.checked)} />
        Show estimated cost field on asset requests
      </label>

      {estimatedCostEnabled && (
        <Field>
          <Label>Estimated cost visible to</Label>
          <div className="space-y-1.5">
            {ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={estimatedCostVisibleRoles.includes(role)}
                  onChange={() => toggleEstimatedCostRole(role)}
                />
                {role.replace('_', ' ')}
              </label>
            ))}
          </div>
        </Field>
      )}

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={signatureRequired} onChange={(e) => setSignatureRequired(e.target.checked)} />
        Signature is required for users
      </label>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={scanEnabled} onChange={(e) => setScanEnabled(e.target.checked)} />
        Enable the Scan Asset feature (camera QR scanning and tag lookup)
      </label>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={qrCodeEnabled} onChange={(e) => setQrCodeEnabled(e.target.checked)} />
        Show QR code on asset labels (unchecked shows the asset tag/number only)
      </label>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={inlineCreateEnabled} onChange={(e) => setInlineCreateEnabled(e.target.checked)} />
        Allow creating a new category, location or supplier directly from the asset/inventory forms
      </label>

      <Field>
        <Label htmlFor="pageSize">Rows per page</Label>
        <Input
          id="pageSize"
          type="number"
          min={5}
          max={500}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="max-w-32"
        />
      </Field>

      <Field>
        <Label>Maximum upload sizes (KB)</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="maxLogoSizeKb">Logo</Label>
            <Input
              id="maxLogoSizeKb"
              type="number"
              min={1}
              max={20480}
              value={maxLogoSizeKb}
              onChange={(e) => setMaxLogoSizeKb(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="maxFaviconSizeKb">Favicon</Label>
            <Input
              id="maxFaviconSizeKb"
              type="number"
              min={1}
              max={20480}
              value={maxFaviconSizeKb}
              onChange={(e) => setMaxFaviconSizeKb(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="maxSignatureSizeKb">Signature</Label>
            <Input
              id="maxSignatureSizeKb"
              type="number"
              min={1}
              max={20480}
              value={maxSignatureSizeKb}
              onChange={(e) => setMaxSignatureSizeKb(Number(e.target.value))}
            />
          </div>
        </div>
      </Field>

      <Field>
        <Label>Show as cards (unchecked lists render as tables)</Label>
        <div className="space-y-1.5">
          {CARD_VIEW_LISTS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={cardViewLists.includes(key)} onChange={() => toggleCardView(key)} />
              {label}
            </label>
          ))}
        </div>
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting || visibleRoles.length === 0}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}

function ThemeSection({
  settings,
  onSaved,
  maxLogoSizeKb,
  maxFaviconSizeKb,
}: {
  settings?: ThemeSettingsRecord;
  onSaved: () => void;
  maxLogoSizeKb: number;
  maxFaviconSizeKb: number;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardBody>
          <ColorForm settings={settings} onSaved={onSaved} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>Branding</CardHeader>
        <CardBody>
          <BrandingAssetField
            field="logoUrl"
            label="Logo"
            accept="image/*"
            currentUrl={settings?.logoUrl ?? null}
            maxSizeKb={maxLogoSizeKb}
            onSaved={onSaved}
          />
          <BrandingAssetField
            field="faviconUrl"
            label="Favicon"
            accept="image/png,image/x-icon,image/svg+xml"
            currentUrl={settings?.faviconUrl ?? null}
            maxSizeKb={maxFaviconSizeKb}
            onSaved={onSaved}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function ColorForm({ settings, onSaved }: { settings?: ThemeSettingsRecord; onSaved: () => void }) {
  const { refreshTheme } = useAuth();
  const [theme, setTheme] = useState<ThemeSettingsRecord>(settings ?? DEFAULT_THEME);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function setColor(key: ColorKey, value: string) {
    setTheme((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function resetToDefaults() {
    setTheme((prev) => ({ ...prev, ...DEFAULT_THEME, logoUrl: prev.logoUrl, faviconUrl: prev.faviconUrl, companyName: prev.companyName }));
    applyTheme({ ...DEFAULT_THEME, logoUrl: theme.logoUrl, faviconUrl: theme.faviconUrl, companyName: theme.companyName });
    setSaved(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save this theme?', message: 'This changes the color palette for everyone using the app.' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/theme', {
        companyName: theme.companyName || null,
        navy: theme.navy,
        navyDark: theme.navyDark,
        gold: theme.gold,
        goldDark: theme.goldDark,
        goldLight: theme.goldLight,
        cream: theme.cream,
        creamDark: theme.creamDark,
      });
      await refreshTheme();
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save theme');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}

      <Field>
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          value={theme.companyName ?? ''}
          onChange={(e) => setTheme((prev) => ({ ...prev, companyName: e.target.value }))}
          placeholder="Shown on the sidebar and login page when no logo is set"
        />
      </Field>

      <div className="space-y-5">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title}>
            <CardHeader className="px-0 pb-2 pt-0">{group.title}</CardHeader>
            <div className="flex flex-wrap gap-4">
              {group.fields.map(({ key, label }) => (
                <div key={key} className="mb-4 w-32">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={key}
                      type="color"
                      value={theme[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-slate-200"
                    />
                    <span className="text-xs text-slate-500">{theme[key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={resetToDefaults}>
          Reset colors to defaults
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}

function BrandingAssetField({
  field,
  label,
  accept,
  currentUrl,
  maxSizeKb,
  onSaved,
}: {
  field: 'logoUrl' | 'faviconUrl';
  label: string;
  accept: string;
  currentUrl: string | null;
  maxSizeKb: number;
  onSaved: () => void;
}) {
  const { refreshTheme } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = brandLogoUrl(currentUrl);
  const endpoint = field === 'logoUrl' ? '/settings/theme/logo' : '/settings/theme/favicon';

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > maxSizeKb * 1024) {
      setError(`${label} must be ${maxSizeKb} KB or smaller`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadFile(endpoint, file);
      await refreshTheme();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to upload ${label.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await api.del(endpoint);
      await refreshTheme();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to remove ${label.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size
          <img src={previewUrl} alt={label} className="max-h-12 max-w-12 object-contain" />
        ) : (
          <span className="text-[10px] text-slate-400">None</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">Max {maxSizeKb} KB</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="mt-1 flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Working…' : previewUrl ? 'Replace' : 'Upload'}
          </Button>
          {previewUrl && (
            <button type="button" onClick={onRemove} disabled={busy} className="text-xs font-medium text-red-600 hover:underline">
              Remove
            </button>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>
  );
}
