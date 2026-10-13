'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { LabelOrientation, LabelPrintSettingsRecord, LabelTemplate } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Label, Select, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';

const FONT_OPTIONS = [
  'Arial, Helvetica, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Courier New", Courier, monospace',
  'Tahoma, Geneva, sans-serif',
];

const TEMPLATE_OPTIONS: { value: LabelTemplate; label: string }[] = [
  { value: 'QR_LEFT_TEXT_RIGHT', label: 'QR code left, text right' },
  { value: 'QR_TOP_TEXT_BOTTOM', label: 'QR code on top, text below' },
  { value: 'TEXT_ONLY', label: 'Text only (no QR code)' },
  { value: 'QR_ONLY', label: 'QR code only (no text)' },
];

const DEFAULTS: LabelPrintSettingsRecord = {
  widthIn: '2',
  heightIn: '1',
  orientation: 'PORTRAIT',
  marginTopIn: '0',
  marginRightIn: '0',
  marginBottomIn: '0',
  marginLeftIn: '0',
  template: 'QR_LEFT_TEXT_RIGHT',
  fontFamily: FONT_OPTIONS[0],
  fontSizePt: 10,
};

export default function LabelPrintSettingsPage() {
  const { data: settings, loading, refetch } = useApi<LabelPrintSettingsRecord>('/settings/label-print');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Label Printing"
        description="Set the paper size, margins, content layout and font used when printing an asset tag label from the asset detail page."
      />
      <Card>
        <CardBody>
          <LabelPrintForm key={settings ? 'loaded' : 'loading'} settings={settings} onSaved={refetch} />
        </CardBody>
      </Card>
    </div>
  );
}

function LabelPrintForm({ settings, onSaved }: { settings?: LabelPrintSettingsRecord; onSaved: () => void }) {
  const [widthIn, setWidthIn] = useState(settings?.widthIn ?? DEFAULTS.widthIn);
  const [heightIn, setHeightIn] = useState(settings?.heightIn ?? DEFAULTS.heightIn);
  const [orientation, setOrientation] = useState<LabelOrientation>(settings?.orientation ?? DEFAULTS.orientation);
  const [marginTopIn, setMarginTopIn] = useState(settings?.marginTopIn ?? DEFAULTS.marginTopIn);
  const [marginRightIn, setMarginRightIn] = useState(settings?.marginRightIn ?? DEFAULTS.marginRightIn);
  const [marginBottomIn, setMarginBottomIn] = useState(settings?.marginBottomIn ?? DEFAULTS.marginBottomIn);
  const [marginLeftIn, setMarginLeftIn] = useState(settings?.marginLeftIn ?? DEFAULTS.marginLeftIn);
  const [template, setTemplate] = useState<LabelTemplate>(settings?.template ?? DEFAULTS.template);
  const [fontFamily, setFontFamily] = useState(settings?.fontFamily ?? DEFAULTS.fontFamily);
  const [fontSizePt, setFontSizePt] = useState(settings?.fontSizePt ?? DEFAULTS.fontSizePt);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function applyDefaults(d: LabelPrintSettingsRecord) {
    setWidthIn(d.widthIn);
    setHeightIn(d.heightIn);
    setOrientation(d.orientation);
    setMarginTopIn(d.marginTopIn);
    setMarginRightIn(d.marginRightIn);
    setMarginBottomIn(d.marginBottomIn);
    setMarginLeftIn(d.marginLeftIn);
    setTemplate(d.template);
    setFontFamily(d.fontFamily);
    setFontSizePt(d.fontSizePt);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save these label printing settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/label-print', {
        widthIn: Number(widthIn),
        heightIn: Number(heightIn),
        orientation,
        marginTopIn: Number(marginTopIn),
        marginRightIn: Number(marginRightIn),
        marginBottomIn: Number(marginBottomIn),
        marginLeftIn: Number(marginLeftIn),
        template,
        fontFamily,
        fontSizePt: Number(fontSizePt),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save label printing settings');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRestoreDefaults() {
    const ok = await confirm({
      title: 'Restore default label printing settings?',
      message: 'This resets paper size, margins, template and font back to the factory defaults (2in x 1in, portrait, no margins, QR left / text right, Arial 10pt).',
    });
    if (!ok) return;
    setRestoring(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.del<LabelPrintSettingsRecord>('/settings/label-print');
      applyDefaults(result);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to restore default settings');
    } finally {
      setRestoring(false);
    }
  }

  const previewWidthIn = Math.min(Number(widthIn) || 2, 4);
  const previewHeightIn = Math.min(Number(heightIn) || 1, 4);
  const showQr = template !== 'TEXT_ONLY';
  const showText = template !== 'QR_ONLY';

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="widthIn" required>Width (inches)</Label>
          <Input
            id="widthIn"
            type="number"
            step="0.1"
            min="0.5"
            max="12"
            required
            value={widthIn}
            onChange={(e) => setWidthIn(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="heightIn" required>Height (inches)</Label>
          <Input
            id="heightIn"
            type="number"
            step="0.1"
            min="0.5"
            max="12"
            required
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
          />
        </Field>
      </div>

      <Field>
        <Label htmlFor="orientation">Orientation</Label>
        <Select id="orientation" value={orientation} onChange={(e) => setOrientation(e.target.value as LabelOrientation)}>
          <option value="PORTRAIT">Portrait (upright)</option>
          <option value="LANDSCAPE">Landscape (rotated 90°)</option>
        </Select>
      </Field>

      <p className="mb-1.5 mt-3 text-xs font-medium text-slate-600">Margins (inches)</p>
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Field>
          <Label htmlFor="marginTopIn">Top</Label>
          <Input id="marginTopIn" type="number" step="0.05" min="0" max="2" value={marginTopIn} onChange={(e) => setMarginTopIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="marginRightIn">Right</Label>
          <Input id="marginRightIn" type="number" step="0.05" min="0" max="2" value={marginRightIn} onChange={(e) => setMarginRightIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="marginBottomIn">Bottom</Label>
          <Input id="marginBottomIn" type="number" step="0.05" min="0" max="2" value={marginBottomIn} onChange={(e) => setMarginBottomIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor="marginLeftIn">Left</Label>
          <Input id="marginLeftIn" type="number" step="0.05" min="0" max="2" value={marginLeftIn} onChange={(e) => setMarginLeftIn(e.target.value)} />
        </Field>
      </div>

      <Field>
        <Label htmlFor="template">Content layout</Label>
        <Select id="template" value={template} onChange={(e) => setTemplate(e.target.value as LabelTemplate)}>
          {TEMPLATE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label htmlFor="fontFamily">Font</Label>
        <Select id="fontFamily" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f.split(',')[0].replace(/"/g, '')}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label htmlFor="fontSizePt" required>Font size (pt)</Label>
        <Input
          id="fontSizePt"
          type="number"
          step="1"
          min="4"
          max="72"
          required
          value={fontSizePt}
          onChange={(e) => setFontSizePt(Number(e.target.value))}
        />
      </Field>

      <div className="mb-4 mt-2">
        <p className="mb-1.5 text-xs font-medium text-slate-500">Preview</p>
        <div
          className="flex items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white"
          style={{
            width: `${previewWidthIn * 72}px`,
            height: `${previewHeightIn * 72}px`,
            paddingTop: `${Math.min(Number(marginTopIn) || 0, previewHeightIn / 2) * 72}px`,
            paddingRight: `${Math.min(Number(marginRightIn) || 0, previewWidthIn / 2) * 72}px`,
            paddingBottom: `${Math.min(Number(marginBottomIn) || 0, previewHeightIn / 2) * 72}px`,
            paddingLeft: `${Math.min(Number(marginLeftIn) || 0, previewWidthIn / 2) * 72}px`,
          }}
        >
          <div
            className="flex items-center justify-center gap-1.5"
            style={{
              flexDirection: template === 'QR_TOP_TEXT_BOTTOM' ? 'column' : 'row',
              fontFamily,
              fontSize: `${fontSizePt}pt`,
              transform: orientation === 'LANDSCAPE' ? 'rotate(90deg)' : undefined,
            }}
          >
            {showQr && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-slate-200 text-[8px] text-slate-500">
                QR
              </div>
            )}
            {showText && (
              <div className="min-w-0 text-center leading-tight">
                <div className="truncate font-bold text-navy">AST-00123</div>
                <div className="truncate text-slate-600">Sample Asset Name</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting || restoring}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onRestoreDefaults} disabled={submitting || restoring}>
          {restoring ? 'Restoring…' : 'Restore Defaults'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
