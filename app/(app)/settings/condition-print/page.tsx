'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { printAssetCondition } from '@/lib/condition-print';
import type { ConditionPrintSettingsRecord, LabelOrientation, LabelLayout } from '@/lib/types';
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

const DEFAULTS: ConditionPrintSettingsRecord = {
  widthIn: '2',
  heightIn: '1',
  orientation: 'PORTRAIT',
  marginTopIn: '0',
  marginRightIn: '0',
  marginBottomIn: '0',
  marginLeftIn: '0',
  includeAssetTag: true,
  includeCondition: true,
  includeNote: true,
  layout: 'SIDE_BY_SIDE',
  tagFontFamily: FONT_OPTIONS[0],
  tagFontSizePt: 10,
  tagMarginTopIn: '0',
  tagMarginRightIn: '0',
  tagMarginBottomIn: '0',
  tagMarginLeftIn: '0',
  conditionFontFamily: FONT_OPTIONS[0],
  conditionFontSizePt: 9,
  conditionMarginTopIn: '0',
  conditionMarginRightIn: '0',
  conditionMarginBottomIn: '0',
  conditionMarginLeftIn: '0',
  noteFontFamily: FONT_OPTIONS[0],
  noteFontSizePt: 8,
  noteMarginTopIn: '0',
  noteMarginRightIn: '0',
  noteMarginBottomIn: '0',
  noteMarginLeftIn: '0',
};

const SAMPLE_TAG = 'AST-00123';
const SAMPLE_CONDITION = 'DAMAGED';
const SAMPLE_NOTE = 'Screen cracked, bottom-right corner';

export default function ConditionPrintSettingsPage() {
  const { data: settings, loading, refetch } = useApi<ConditionPrintSettingsRecord>('/settings/condition-print');

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Condition Printing"
        description="Set the paper size, margins, which fields appear, and each field's own font, size and spacing, used when printing an asset's condition from the asset detail page."
      />
      <Card>
        <CardBody>
          <ConditionPrintForm key={settings ? 'loaded' : 'loading'} settings={settings} onSaved={refetch} />
        </CardBody>
      </Card>
    </div>
  );
}

/** One field's font + margin controls — reused for asset tag, condition and condition note so
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

function ConditionPrintForm({ settings, onSaved }: { settings?: ConditionPrintSettingsRecord; onSaved: () => void }) {
  const [widthIn, setWidthIn] = useState(settings?.widthIn ?? DEFAULTS.widthIn);
  const [heightIn, setHeightIn] = useState(settings?.heightIn ?? DEFAULTS.heightIn);
  const [orientation, setOrientation] = useState<LabelOrientation>(settings?.orientation ?? DEFAULTS.orientation);
  const [marginTopIn, setMarginTopIn] = useState(settings?.marginTopIn ?? DEFAULTS.marginTopIn);
  const [marginRightIn, setMarginRightIn] = useState(settings?.marginRightIn ?? DEFAULTS.marginRightIn);
  const [marginBottomIn, setMarginBottomIn] = useState(settings?.marginBottomIn ?? DEFAULTS.marginBottomIn);
  const [marginLeftIn, setMarginLeftIn] = useState(settings?.marginLeftIn ?? DEFAULTS.marginLeftIn);
  const [includeAssetTag, setIncludeAssetTag] = useState(settings?.includeAssetTag ?? DEFAULTS.includeAssetTag);
  const [includeCondition, setIncludeCondition] = useState(settings?.includeCondition ?? DEFAULTS.includeCondition);
  const [includeNote, setIncludeNote] = useState(settings?.includeNote ?? DEFAULTS.includeNote);
  const [layout, setLayout] = useState<LabelLayout>(settings?.layout ?? DEFAULTS.layout);

  const [tagFontFamily, setTagFontFamily] = useState(settings?.tagFontFamily ?? DEFAULTS.tagFontFamily);
  const [tagFontSizePt, setTagFontSizePt] = useState(settings?.tagFontSizePt ?? DEFAULTS.tagFontSizePt);
  const [tagMarginTopIn, setTagMarginTopIn] = useState(settings?.tagMarginTopIn ?? DEFAULTS.tagMarginTopIn);
  const [tagMarginRightIn, setTagMarginRightIn] = useState(settings?.tagMarginRightIn ?? DEFAULTS.tagMarginRightIn);
  const [tagMarginBottomIn, setTagMarginBottomIn] = useState(settings?.tagMarginBottomIn ?? DEFAULTS.tagMarginBottomIn);
  const [tagMarginLeftIn, setTagMarginLeftIn] = useState(settings?.tagMarginLeftIn ?? DEFAULTS.tagMarginLeftIn);

  const [conditionFontFamily, setConditionFontFamily] = useState(settings?.conditionFontFamily ?? DEFAULTS.conditionFontFamily);
  const [conditionFontSizePt, setConditionFontSizePt] = useState(settings?.conditionFontSizePt ?? DEFAULTS.conditionFontSizePt);
  const [conditionMarginTopIn, setConditionMarginTopIn] = useState(settings?.conditionMarginTopIn ?? DEFAULTS.conditionMarginTopIn);
  const [conditionMarginRightIn, setConditionMarginRightIn] = useState(settings?.conditionMarginRightIn ?? DEFAULTS.conditionMarginRightIn);
  const [conditionMarginBottomIn, setConditionMarginBottomIn] = useState(settings?.conditionMarginBottomIn ?? DEFAULTS.conditionMarginBottomIn);
  const [conditionMarginLeftIn, setConditionMarginLeftIn] = useState(settings?.conditionMarginLeftIn ?? DEFAULTS.conditionMarginLeftIn);

  const [noteFontFamily, setNoteFontFamily] = useState(settings?.noteFontFamily ?? DEFAULTS.noteFontFamily);
  const [noteFontSizePt, setNoteFontSizePt] = useState(settings?.noteFontSizePt ?? DEFAULTS.noteFontSizePt);
  const [noteMarginTopIn, setNoteMarginTopIn] = useState(settings?.noteMarginTopIn ?? DEFAULTS.noteMarginTopIn);
  const [noteMarginRightIn, setNoteMarginRightIn] = useState(settings?.noteMarginRightIn ?? DEFAULTS.noteMarginRightIn);
  const [noteMarginBottomIn, setNoteMarginBottomIn] = useState(settings?.noteMarginBottomIn ?? DEFAULTS.noteMarginBottomIn);
  const [noteMarginLeftIn, setNoteMarginLeftIn] = useState(settings?.noteMarginLeftIn ?? DEFAULTS.noteMarginLeftIn);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function applyDefaults(d: ConditionPrintSettingsRecord) {
    setWidthIn(d.widthIn);
    setHeightIn(d.heightIn);
    setOrientation(d.orientation);
    setMarginTopIn(d.marginTopIn);
    setMarginRightIn(d.marginRightIn);
    setMarginBottomIn(d.marginBottomIn);
    setMarginLeftIn(d.marginLeftIn);
    setIncludeAssetTag(d.includeAssetTag);
    setIncludeCondition(d.includeCondition);
    setIncludeNote(d.includeNote);
    setLayout(d.layout);
    setTagFontFamily(d.tagFontFamily);
    setTagFontSizePt(d.tagFontSizePt);
    setTagMarginTopIn(d.tagMarginTopIn);
    setTagMarginRightIn(d.tagMarginRightIn);
    setTagMarginBottomIn(d.tagMarginBottomIn);
    setTagMarginLeftIn(d.tagMarginLeftIn);
    setConditionFontFamily(d.conditionFontFamily);
    setConditionFontSizePt(d.conditionFontSizePt);
    setConditionMarginTopIn(d.conditionMarginTopIn);
    setConditionMarginRightIn(d.conditionMarginRightIn);
    setConditionMarginBottomIn(d.conditionMarginBottomIn);
    setConditionMarginLeftIn(d.conditionMarginLeftIn);
    setNoteFontFamily(d.noteFontFamily);
    setNoteFontSizePt(d.noteFontSizePt);
    setNoteMarginTopIn(d.noteMarginTopIn);
    setNoteMarginRightIn(d.noteMarginRightIn);
    setNoteMarginBottomIn(d.noteMarginBottomIn);
    setNoteMarginLeftIn(d.noteMarginLeftIn);
  }

  function currentSettings(): ConditionPrintSettingsRecord {
    return {
      widthIn,
      heightIn,
      orientation,
      marginTopIn,
      marginRightIn,
      marginBottomIn,
      marginLeftIn,
      includeAssetTag,
      includeCondition,
      includeNote,
      layout,
      tagFontFamily,
      tagFontSizePt: Number(tagFontSizePt),
      tagMarginTopIn,
      tagMarginRightIn,
      tagMarginBottomIn,
      tagMarginLeftIn,
      conditionFontFamily,
      conditionFontSizePt: Number(conditionFontSizePt),
      conditionMarginTopIn,
      conditionMarginRightIn,
      conditionMarginBottomIn,
      conditionMarginLeftIn,
      noteFontFamily,
      noteFontSizePt: Number(noteFontSizePt),
      noteMarginTopIn,
      noteMarginRightIn,
      noteMarginBottomIn,
      noteMarginLeftIn,
    };
  }

  // The backend DTO requires widthIn/heightIn/every margin as numbers, but the same string
  // values are also fed to printAssetCondition() for Test Print, which expects the
  // ConditionPrintSettingsRecord shape (margins as strings) — so the PUT body is built
  // separately here rather than reusing currentSettings() directly.
  function buildUpdatePayload() {
    const s = currentSettings();
    return {
      widthIn: Number(s.widthIn),
      heightIn: Number(s.heightIn),
      orientation: s.orientation,
      marginTopIn: Number(s.marginTopIn),
      marginRightIn: Number(s.marginRightIn),
      marginBottomIn: Number(s.marginBottomIn),
      marginLeftIn: Number(s.marginLeftIn),
      includeAssetTag: s.includeAssetTag,
      includeCondition: s.includeCondition,
      includeNote: s.includeNote,
      layout: s.layout,
      tagFontFamily: s.tagFontFamily,
      tagFontSizePt: s.tagFontSizePt,
      tagMarginTopIn: Number(s.tagMarginTopIn),
      tagMarginRightIn: Number(s.tagMarginRightIn),
      tagMarginBottomIn: Number(s.tagMarginBottomIn),
      tagMarginLeftIn: Number(s.tagMarginLeftIn),
      conditionFontFamily: s.conditionFontFamily,
      conditionFontSizePt: s.conditionFontSizePt,
      conditionMarginTopIn: Number(s.conditionMarginTopIn),
      conditionMarginRightIn: Number(s.conditionMarginRightIn),
      conditionMarginBottomIn: Number(s.conditionMarginBottomIn),
      conditionMarginLeftIn: Number(s.conditionMarginLeftIn),
      noteFontFamily: s.noteFontFamily,
      noteFontSizePt: s.noteFontSizePt,
      noteMarginTopIn: Number(s.noteMarginTopIn),
      noteMarginRightIn: Number(s.noteMarginRightIn),
      noteMarginBottomIn: Number(s.noteMarginBottomIn),
      noteMarginLeftIn: Number(s.noteMarginLeftIn),
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!includeAssetTag && !includeCondition && !includeNote) {
      setError('At least one of asset tag, condition or note must be included');
      return;
    }
    const ok = await confirm({ title: 'Save these condition printing settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/condition-print', buildUpdatePayload());
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save condition printing settings');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRestoreDefaults() {
    const ok = await confirm({
      title: 'Restore default condition printing settings?',
      message: 'This resets paper size, margins, included fields, layout and each field\'s font back to the factory defaults (2in x 1in, portrait, no margins, tag + condition + note side by side).',
    });
    if (!ok) return;
    setRestoring(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.del<ConditionPrintSettingsRecord>('/settings/condition-print');
      applyDefaults(result);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to restore default settings');
    } finally {
      setRestoring(false);
    }
  }

  function onTestPrint() {
    setPrinting(true);
    setError(null);
    try {
      // Uses whatever is currently in the form, saved or not, so an admin can try changes
      // before committing to them.
      printAssetCondition({
        settings: currentSettings(),
        assetTag: SAMPLE_TAG,
        condition: SAMPLE_CONDITION,
        conditionNote: SAMPLE_NOTE,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to prepare test print');
    } finally {
      setPrinting(false);
    }
  }

  const previewWidthIn = Math.min(Number(widthIn) || 2, 4);
  const previewHeightIn = Math.min(Number(heightIn) || 1, 4);
  const showText = includeAssetTag || includeCondition || includeNote;

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
          <input type="checkbox" checked={includeAssetTag} onChange={(e) => setIncludeAssetTag(e.target.checked)} />
          Asset tag
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeCondition} onChange={(e) => setIncludeCondition(e.target.checked)} />
          Condition
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} />
          Condition note
        </label>
      </div>

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
      {includeCondition && (
        <FieldStyleFields
          title="Condition"
          idPrefix="condition"
          fontFamily={conditionFontFamily}
          setFontFamily={setConditionFontFamily}
          fontSizePt={conditionFontSizePt}
          setFontSizePt={setConditionFontSizePt}
          marginTopIn={conditionMarginTopIn}
          setMarginTopIn={setConditionMarginTopIn}
          marginRightIn={conditionMarginRightIn}
          setMarginRightIn={setConditionMarginRightIn}
          marginBottomIn={conditionMarginBottomIn}
          setMarginBottomIn={setConditionMarginBottomIn}
          marginLeftIn={conditionMarginLeftIn}
          setMarginLeftIn={setConditionMarginLeftIn}
        />
      )}
      {includeNote && (
        <FieldStyleFields
          title="Condition note"
          idPrefix="note"
          fontFamily={noteFontFamily}
          setFontFamily={setNoteFontFamily}
          fontSizePt={noteFontSizePt}
          setFontSizePt={setNoteFontSizePt}
          marginTopIn={noteMarginTopIn}
          setMarginTopIn={setNoteMarginTopIn}
          marginRightIn={noteMarginRightIn}
          setMarginRightIn={setNoteMarginRightIn}
          marginBottomIn={noteMarginBottomIn}
          setMarginBottomIn={setNoteMarginBottomIn}
          marginLeftIn={noteMarginLeftIn}
          setMarginLeftIn={setNoteMarginLeftIn}
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
          {showText && (
            <div
              className="flex min-w-0 items-center justify-center gap-1.5 text-center"
              style={{
                flexDirection: layout === 'STACKED' ? 'column' : 'row',
                transform: orientation === 'LANDSCAPE' ? 'rotate(90deg)' : undefined,
              }}
            >
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
              {includeCondition && (
                <div
                  className="truncate text-slate-600"
                  style={{
                    fontFamily: conditionFontFamily,
                    fontSize: `${conditionFontSizePt}pt`,
                    margin: `${conditionMarginTopIn}in ${conditionMarginRightIn}in ${conditionMarginBottomIn}in ${conditionMarginLeftIn}in`,
                  }}
                >
                  {SAMPLE_CONDITION}
                </div>
              )}
              {includeNote && (
                <div
                  className="text-slate-500"
                  style={{
                    fontFamily: noteFontFamily,
                    fontSize: `${noteFontSizePt}pt`,
                    margin: `${noteMarginTopIn}in ${noteMarginRightIn}in ${noteMarginBottomIn}in ${noteMarginLeftIn}in`,
                  }}
                >
                  {SAMPLE_NOTE}
                </div>
              )}
            </div>
          )}
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
