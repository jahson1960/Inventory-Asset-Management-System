'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { printAssetLabel } from '@/lib/label-print';
import type { DisplaySettingsRecord, LabelOrientation, LabelLayout, LabelPrintSettingsRecord } from '@/lib/types';
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

const DEFAULTS: LabelPrintSettingsRecord = {
  widthIn: '2',
  heightIn: '1',
  orientation: 'PORTRAIT',
  marginTopIn: '0',
  marginRightIn: '0',
  marginBottomIn: '0',
  marginLeftIn: '0',
  includeQr: true,
  includeAssetTag: true,
  includeName: true,
  includeSerial: true,
  layout: 'SIDE_BY_SIDE',
  tagFontFamily: FONT_OPTIONS[0],
  tagFontSizePt: 10,
  tagMarginTopIn: '0',
  tagMarginRightIn: '0',
  tagMarginBottomIn: '0',
  tagMarginLeftIn: '0',
  nameFontFamily: FONT_OPTIONS[0],
  nameFontSizePt: 9,
  nameMarginTopIn: '0',
  nameMarginRightIn: '0',
  nameMarginBottomIn: '0',
  nameMarginLeftIn: '0',
  serialFontFamily: FONT_OPTIONS[0],
  serialFontSizePt: 8,
  serialMarginTopIn: '0',
  serialMarginRightIn: '0',
  serialMarginBottomIn: '0',
  serialMarginLeftIn: '0',
};

const SAMPLE_TAG = 'AST-00123';
const SAMPLE_NAME = 'Sample Asset Name';
const SAMPLE_SERIAL = 'SN-00000000';

export default function LabelPrintSettingsPage() {
  const { data: settings, loading, refetch } = useApi<LabelPrintSettingsRecord>('/settings/label-print');
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Label Printing"
        description="Set the paper size, margins, which fields appear, and each field's own font, size and spacing, used when printing an asset tag label from the asset detail page."
      />
      <Card>
        <CardBody>
          <LabelPrintForm
            key={settings ? 'loaded' : 'loading'}
            settings={settings}
            qrCodeEnabled={displaySettings?.qrCodeEnabled ?? false}
            onSaved={refetch}
          />
        </CardBody>
      </Card>
    </div>
  );
}

/** One field's font + margin controls — reused for asset tag, asset name and serial number so
 *  each can be styled independently instead of sharing one label-wide font. */
function FieldStyleFields({
  title,
  fontFamily,
  setFontFamily,
  fontSizePt,
  setFontSizePt,
  marginTopIn,
  setMarginTopIn,
  marginRightIn,
  setMarginRightIn,
  marginBottomIn,
  setMarginBottomIn,
  marginLeftIn,
  setMarginLeftIn,
  idPrefix,
}: {
  title: string;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontSizePt: number;
  setFontSizePt: (v: number) => void;
  marginTopIn: string;
  setMarginTopIn: (v: string) => void;
  marginRightIn: string;
  setMarginRightIn: (v: string) => void;
  marginBottomIn: string;
  setMarginBottomIn: (v: string) => void;
  marginLeftIn: string;
  setMarginLeftIn: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="mb-3 rounded-lg border border-slate-200 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-700">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor={`${idPrefix}-font`}>Font</Label>
          <Select id={`${idPrefix}-font`} value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0].replace(/"/g, '')}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-size`} required>Font size (pt)</Label>
          <Input
            id={`${idPrefix}-size`}
            type="number"
            step="1"
            min="4"
            max="72"
            required
            value={fontSizePt}
            onChange={(e) => setFontSizePt(Number(e.target.value))}
          />
        </Field>
      </div>
      <p className="mb-1.5 mt-2 text-xs text-slate-500">Margin (inches)</p>
      <div className="grid grid-cols-4 gap-2">
        <Field>
          <Label htmlFor={`${idPrefix}-mt`}>Top</Label>
          <Input id={`${idPrefix}-mt`} type="number" step="0.05" min="0" max="2" value={marginTopIn} onChange={(e) => setMarginTopIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-mr`}>Right</Label>
          <Input id={`${idPrefix}-mr`} type="number" step="0.05" min="0" max="2" value={marginRightIn} onChange={(e) => setMarginRightIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-mb`}>Bottom</Label>
          <Input id={`${idPrefix}-mb`} type="number" step="0.05" min="0" max="2" value={marginBottomIn} onChange={(e) => setMarginBottomIn(e.target.value)} />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-ml`}>Left</Label>
          <Input id={`${idPrefix}-ml`} type="number" step="0.05" min="0" max="2" value={marginLeftIn} onChange={(e) => setMarginLeftIn(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function LabelPrintForm({
  settings,
  qrCodeEnabled,
  onSaved,
}: {
  settings?: LabelPrintSettingsRecord;
  qrCodeEnabled: boolean;
  onSaved: () => void;
}) {
  const [widthIn, setWidthIn] = useState(settings?.widthIn ?? DEFAULTS.widthIn);
  const [heightIn, setHeightIn] = useState(settings?.heightIn ?? DEFAULTS.heightIn);
  const [orientation, setOrientation] = useState<LabelOrientation>(settings?.orientation ?? DEFAULTS.orientation);
  const [marginTopIn, setMarginTopIn] = useState(settings?.marginTopIn ?? DEFAULTS.marginTopIn);
  const [marginRightIn, setMarginRightIn] = useState(settings?.marginRightIn ?? DEFAULTS.marginRightIn);
  const [marginBottomIn, setMarginBottomIn] = useState(settings?.marginBottomIn ?? DEFAULTS.marginBottomIn);
  const [marginLeftIn, setMarginLeftIn] = useState(settings?.marginLeftIn ?? DEFAULTS.marginLeftIn);
  const [includeQr, setIncludeQr] = useState(settings?.includeQr ?? DEFAULTS.includeQr);
  const [includeAssetTag, setIncludeAssetTag] = useState(settings?.includeAssetTag ?? DEFAULTS.includeAssetTag);
  const [includeName, setIncludeName] = useState(settings?.includeName ?? DEFAULTS.includeName);
  const [includeSerial, setIncludeSerial] = useState(settings?.includeSerial ?? DEFAULTS.includeSerial);
  const [layout, setLayout] = useState<LabelLayout>(settings?.layout ?? DEFAULTS.layout);

  const [tagFontFamily, setTagFontFamily] = useState(settings?.tagFontFamily ?? DEFAULTS.tagFontFamily);
  const [tagFontSizePt, setTagFontSizePt] = useState(settings?.tagFontSizePt ?? DEFAULTS.tagFontSizePt);
  const [tagMarginTopIn, setTagMarginTopIn] = useState(settings?.tagMarginTopIn ?? DEFAULTS.tagMarginTopIn);
  const [tagMarginRightIn, setTagMarginRightIn] = useState(settings?.tagMarginRightIn ?? DEFAULTS.tagMarginRightIn);
  const [tagMarginBottomIn, setTagMarginBottomIn] = useState(settings?.tagMarginBottomIn ?? DEFAULTS.tagMarginBottomIn);
  const [tagMarginLeftIn, setTagMarginLeftIn] = useState(settings?.tagMarginLeftIn ?? DEFAULTS.tagMarginLeftIn);

  const [nameFontFamily, setNameFontFamily] = useState(settings?.nameFontFamily ?? DEFAULTS.nameFontFamily);
  const [nameFontSizePt, setNameFontSizePt] = useState(settings?.nameFontSizePt ?? DEFAULTS.nameFontSizePt);
  const [nameMarginTopIn, setNameMarginTopIn] = useState(settings?.nameMarginTopIn ?? DEFAULTS.nameMarginTopIn);
  const [nameMarginRightIn, setNameMarginRightIn] = useState(settings?.nameMarginRightIn ?? DEFAULTS.nameMarginRightIn);
  const [nameMarginBottomIn, setNameMarginBottomIn] = useState(settings?.nameMarginBottomIn ?? DEFAULTS.nameMarginBottomIn);
  const [nameMarginLeftIn, setNameMarginLeftIn] = useState(settings?.nameMarginLeftIn ?? DEFAULTS.nameMarginLeftIn);

  const [serialFontFamily, setSerialFontFamily] = useState(settings?.serialFontFamily ?? DEFAULTS.serialFontFamily);
  const [serialFontSizePt, setSerialFontSizePt] = useState(settings?.serialFontSizePt ?? DEFAULTS.serialFontSizePt);
  const [serialMarginTopIn, setSerialMarginTopIn] = useState(settings?.serialMarginTopIn ?? DEFAULTS.serialMarginTopIn);
  const [serialMarginRightIn, setSerialMarginRightIn] = useState(settings?.serialMarginRightIn ?? DEFAULTS.serialMarginRightIn);
  const [serialMarginBottomIn, setSerialMarginBottomIn] = useState(settings?.serialMarginBottomIn ?? DEFAULTS.serialMarginBottomIn);
  const [serialMarginLeftIn, setSerialMarginLeftIn] = useState(settings?.serialMarginLeftIn ?? DEFAULTS.serialMarginLeftIn);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [printing, setPrinting] = useState(false);
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
    setIncludeQr(d.includeQr);
    setIncludeAssetTag(d.includeAssetTag);
    setIncludeName(d.includeName);
    setIncludeSerial(d.includeSerial);
    setLayout(d.layout);
    setTagFontFamily(d.tagFontFamily);
    setTagFontSizePt(d.tagFontSizePt);
    setTagMarginTopIn(d.tagMarginTopIn);
    setTagMarginRightIn(d.tagMarginRightIn);
    setTagMarginBottomIn(d.tagMarginBottomIn);
    setTagMarginLeftIn(d.tagMarginLeftIn);
    setNameFontFamily(d.nameFontFamily);
    setNameFontSizePt(d.nameFontSizePt);
    setNameMarginTopIn(d.nameMarginTopIn);
    setNameMarginRightIn(d.nameMarginRightIn);
    setNameMarginBottomIn(d.nameMarginBottomIn);
    setNameMarginLeftIn(d.nameMarginLeftIn);
    setSerialFontFamily(d.serialFontFamily);
    setSerialFontSizePt(d.serialFontSizePt);
    setSerialMarginTopIn(d.serialMarginTopIn);
    setSerialMarginRightIn(d.serialMarginRightIn);
    setSerialMarginBottomIn(d.serialMarginBottomIn);
    setSerialMarginLeftIn(d.serialMarginLeftIn);
  }

  function currentSettings(): LabelPrintSettingsRecord {
    return {
      widthIn,
      heightIn,
      orientation,
      marginTopIn,
      marginRightIn,
      marginBottomIn,
      marginLeftIn,
      includeQr,
      includeAssetTag,
      includeName,
      includeSerial,
      layout,
      tagFontFamily,
      tagFontSizePt: Number(tagFontSizePt),
      tagMarginTopIn,
      tagMarginRightIn,
      tagMarginBottomIn,
      tagMarginLeftIn,
      nameFontFamily,
      nameFontSizePt: Number(nameFontSizePt),
      nameMarginTopIn,
      nameMarginRightIn,
      nameMarginBottomIn,
      nameMarginLeftIn,
      serialFontFamily,
      serialFontSizePt: Number(serialFontSizePt),
      serialMarginTopIn,
      serialMarginRightIn,
      serialMarginBottomIn,
      serialMarginLeftIn,
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!includeQr && !includeAssetTag && !includeName && !includeSerial) {
      setError('At least one of QR code, asset tag, name or serial number must be included');
      return;
    }
    const ok = await confirm({ title: 'Save these label printing settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/label-print', currentSettings());
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
      message: 'This resets paper size, margins, included fields, layout and each field\'s font back to the factory defaults (2in x 1in, portrait, no margins, QR + tag + name + serial side by side).',
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

  async function onTestPrint() {
    setPrinting(true);
    setError(null);
    try {
      // Uses whatever is currently in the form, saved or not, so an admin can try changes
      // before committing to them.
      await printAssetLabel({
        settings: currentSettings(),
        assetTag: SAMPLE_TAG,
        assetName: SAMPLE_NAME,
        serialNumber: SAMPLE_SERIAL,
        qrCodeEnabled,
        qrCodePath: '/settings/label-print/sample-qr',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to prepare test print');
    } finally {
      setPrinting(false);
    }
  }

  const previewWidthIn = Math.min(Number(widthIn) || 2, 4);
  const previewHeightIn = Math.min(Number(heightIn) || 1, 4);
  const showQr = includeQr && qrCodeEnabled;
  const showText = includeAssetTag || includeName || includeSerial;

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

      <p className="mb-1.5 mt-3 text-xs font-medium text-slate-600">Paper margins (inches)</p>
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

      <p className="mb-1.5 mt-3 text-xs font-medium text-slate-600">What to print</p>
      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeQr} onChange={(e) => setIncludeQr(e.target.checked)} />
          QR code
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeAssetTag} onChange={(e) => setIncludeAssetTag(e.target.checked)} />
          Asset tag
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeName} onChange={(e) => setIncludeName(e.target.checked)} />
          Asset name
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeSerial} onChange={(e) => setIncludeSerial(e.target.checked)} />
          Serial number
        </label>
      </div>
      {!qrCodeEnabled && (
        <p className="mb-3 -mt-2 text-xs text-slate-400">QR codes are currently disabled organization-wide in Settings → Display, so none will print even if checked above.</p>
      )}

      <Field>
        <Label htmlFor="layout">Layout (when more than one field is included)</Label>
        <Select id="layout" value={layout} onChange={(e) => setLayout(e.target.value as LabelLayout)}>
          <option value="SIDE_BY_SIDE">Side by side</option>
          <option value="STACKED">Stacked</option>
        </Select>
      </Field>

      <p className="mb-1.5 mt-4 text-xs font-medium text-slate-600">Per-field font &amp; spacing</p>
      {includeAssetTag && (
        <FieldStyleFields
          title="Asset tag"
          idPrefix="tag"
          fontFamily={tagFontFamily}
          setFontFamily={setTagFontFamily}
          fontSizePt={tagFontSizePt}
          setFontSizePt={setTagFontSizePt}
          marginTopIn={tagMarginTopIn}
          setMarginTopIn={setTagMarginTopIn}
          marginRightIn={tagMarginRightIn}
          setMarginRightIn={setTagMarginRightIn}
          marginBottomIn={tagMarginBottomIn}
          setMarginBottomIn={setTagMarginBottomIn}
          marginLeftIn={tagMarginLeftIn}
          setMarginLeftIn={setTagMarginLeftIn}
        />
      )}
      {includeName && (
        <FieldStyleFields
          title="Asset name"
          idPrefix="name"
          fontFamily={nameFontFamily}
          setFontFamily={setNameFontFamily}
          fontSizePt={nameFontSizePt}
          setFontSizePt={setNameFontSizePt}
          marginTopIn={nameMarginTopIn}
          setMarginTopIn={setNameMarginTopIn}
          marginRightIn={nameMarginRightIn}
          setMarginRightIn={setNameMarginRightIn}
          marginBottomIn={nameMarginBottomIn}
          setMarginBottomIn={setNameMarginBottomIn}
          marginLeftIn={nameMarginLeftIn}
          setMarginLeftIn={setNameMarginLeftIn}
        />
      )}
      {includeSerial && (
        <FieldStyleFields
          title="Serial number"
          idPrefix="serial"
          fontFamily={serialFontFamily}
          setFontFamily={setSerialFontFamily}
          fontSizePt={serialFontSizePt}
          setFontSizePt={setSerialFontSizePt}
          marginTopIn={serialMarginTopIn}
          setMarginTopIn={setSerialMarginTopIn}
          marginRightIn={serialMarginRightIn}
          setMarginRightIn={setSerialMarginRightIn}
          marginBottomIn={serialMarginBottomIn}
          setMarginBottomIn={setSerialMarginBottomIn}
          marginLeftIn={serialMarginLeftIn}
          setMarginLeftIn={setSerialMarginLeftIn}
        />
      )}

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
              flexDirection: layout === 'STACKED' ? 'column' : 'row',
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
                {includeAssetTag && (
                  <div
                    className="truncate font-bold text-navy"
                    style={{
                      fontFamily: tagFontFamily,
                      fontSize: `${tagFontSizePt}pt`,
                      margin: `${tagMarginTopIn}in ${tagMarginRightIn}in ${tagMarginBottomIn}in ${tagMarginLeftIn}in`,
                    }}
                  >
                    {SAMPLE_TAG}
                  </div>
                )}
                {includeName && (
                  <div
                    className="truncate text-slate-600"
                    style={{
                      fontFamily: nameFontFamily,
                      fontSize: `${nameFontSizePt}pt`,
                      margin: `${nameMarginTopIn}in ${nameMarginRightIn}in ${nameMarginBottomIn}in ${nameMarginLeftIn}in`,
                    }}
                  >
                    {SAMPLE_NAME}
                  </div>
                )}
                {includeSerial && (
                  <div
                    className="truncate text-slate-500"
                    style={{
                      fontFamily: serialFontFamily,
                      fontSize: `${serialFontSizePt}pt`,
                      margin: `${serialMarginTopIn}in ${serialMarginRightIn}in ${serialMarginBottomIn}in ${serialMarginLeftIn}in`,
                    }}
                  >
                    S/N: {SAMPLE_SERIAL}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={submitting || restoring || printing}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onTestPrint} disabled={submitting || restoring || printing}>
          {printing ? 'Preparing…' : 'Test Print'}
        </Button>
        <Button type="button" variant="secondary" onClick={onRestoreDefaults} disabled={submitting || restoring || printing}>
          {restoring ? 'Restoring…' : 'Restore Defaults'}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
