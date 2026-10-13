'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import type { LabelOrientation, LabelPrintSettingsRecord } from '@/lib/types';
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

export default function LabelPrintSettingsPage() {
  const { data: settings, loading, refetch } = useApi<LabelPrintSettingsRecord>('/settings/label-print');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Label Printing"
        description="Set the paper size, font and font size used when printing an asset tag label from the asset detail page."
      />
      <Card>
        <CardBody>
          <LabelPrintForm settings={settings} onSaved={refetch} />
        </CardBody>
      </Card>
    </div>
  );
}

function LabelPrintForm({ settings, onSaved }: { settings?: LabelPrintSettingsRecord; onSaved: () => void }) {
  const [widthIn, setWidthIn] = useState(settings?.widthIn ?? '2');
  const [heightIn, setHeightIn] = useState(settings?.heightIn ?? '1');
  const [orientation, setOrientation] = useState<LabelOrientation>(settings?.orientation ?? 'PORTRAIT');
  const [fontFamily, setFontFamily] = useState(settings?.fontFamily ?? FONT_OPTIONS[0]);
  const [fontSizePt, setFontSizePt] = useState(settings?.fontSizePt ?? 10);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

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
          className="flex items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white p-2"
          style={{
            width: `${Math.min(Number(widthIn) || 2, 4) * 72}px`,
            height: `${Math.min(Number(heightIn) || 1, 4) * 72}px`,
            fontFamily,
            fontSize: `${fontSizePt}pt`,
            transform: orientation === 'LANDSCAPE' ? 'rotate(90deg)' : undefined,
          }}
        >
          <div className="text-center leading-tight">
            <div className="font-bold text-navy">AST-00123</div>
            <div className="truncate text-slate-600">Sample Asset Name</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
