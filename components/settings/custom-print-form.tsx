'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { printCustomText } from '@/lib/custom-print';
import type { CustomPrintSettingsRecord, LabelOrientation, TextAlign } from '@/lib/types';
import { Field, Label, Select, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { FieldStyleFields, FONT_OPTIONS } from './field-style-fields';

const DEFAULTS: CustomPrintSettingsRecord = {
  widthIn: '2',
  heightIn: '1',
  orientation: 'PORTRAIT',
  marginTopIn: '0',
  marginRightIn: '0',
  marginBottomIn: '0',
  marginLeftIn: '0',
  fontFamily: FONT_OPTIONS[0],
  fontSizePt: 10,
  textAlign: 'CENTER',
  textMarginTopIn: '0',
  textMarginRightIn: '0',
  textMarginBottomIn: '0',
  textMarginLeftIn: '0',
};

const SAMPLE_HTML = 'Fragile — <b>handle with care</b>';

export function CustomPrintForm({ settings, onSaved }: { settings?: CustomPrintSettingsRecord; onSaved: () => void }) {
  const [widthIn, setWidthIn] = useState(settings?.widthIn ?? DEFAULTS.widthIn);
  const [heightIn, setHeightIn] = useState(settings?.heightIn ?? DEFAULTS.heightIn);
  const [orientation, setOrientation] = useState<LabelOrientation>(settings?.orientation ?? DEFAULTS.orientation);
  const [marginTopIn, setMarginTopIn] = useState(settings?.marginTopIn ?? DEFAULTS.marginTopIn);
  const [marginRightIn, setMarginRightIn] = useState(settings?.marginRightIn ?? DEFAULTS.marginRightIn);
  const [marginBottomIn, setMarginBottomIn] = useState(settings?.marginBottomIn ?? DEFAULTS.marginBottomIn);
  const [marginLeftIn, setMarginLeftIn] = useState(settings?.marginLeftIn ?? DEFAULTS.marginLeftIn);

  const [fontFamily, setFontFamily] = useState(settings?.fontFamily ?? DEFAULTS.fontFamily);
  const [fontSizePt, setFontSizePt] = useState(settings?.fontSizePt ?? DEFAULTS.fontSizePt);
  const [textAlign, setTextAlign] = useState<TextAlign>(settings?.textAlign ?? DEFAULTS.textAlign);
  const [textMarginTopIn, setTextMarginTopIn] = useState(settings?.textMarginTopIn ?? DEFAULTS.textMarginTopIn);
  const [textMarginRightIn, setTextMarginRightIn] = useState(settings?.textMarginRightIn ?? DEFAULTS.textMarginRightIn);
  const [textMarginBottomIn, setTextMarginBottomIn] = useState(settings?.textMarginBottomIn ?? DEFAULTS.textMarginBottomIn);
  const [textMarginLeftIn, setTextMarginLeftIn] = useState(settings?.textMarginLeftIn ?? DEFAULTS.textMarginLeftIn);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saved, setSaved] = useState(false);
  const confirm = useConfirm();

  function applyDefaults(d: CustomPrintSettingsRecord) {
    setWidthIn(d.widthIn);
    setHeightIn(d.heightIn);
    setOrientation(d.orientation);
    setMarginTopIn(d.marginTopIn);
    setMarginRightIn(d.marginRightIn);
    setMarginBottomIn(d.marginBottomIn);
    setMarginLeftIn(d.marginLeftIn);
    setFontFamily(d.fontFamily);
    setFontSizePt(d.fontSizePt);
    setTextAlign(d.textAlign);
    setTextMarginTopIn(d.textMarginTopIn);
    setTextMarginRightIn(d.textMarginRightIn);
    setTextMarginBottomIn(d.textMarginBottomIn);
    setTextMarginLeftIn(d.textMarginLeftIn);
  }

  function currentSettings(): CustomPrintSettingsRecord {
    return {
      widthIn,
      heightIn,
      orientation,
      marginTopIn,
      marginRightIn,
      marginBottomIn,
      marginLeftIn,
      fontFamily,
      fontSizePt: Number(fontSizePt),
      textAlign,
      textMarginTopIn,
      textMarginRightIn,
      textMarginBottomIn,
      textMarginLeftIn,
    };
  }

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
      fontFamily: s.fontFamily,
      fontSizePt: s.fontSizePt,
      textAlign: s.textAlign,
      textMarginTopIn: Number(s.textMarginTopIn),
      textMarginRightIn: Number(s.textMarginRightIn),
      textMarginBottomIn: Number(s.textMarginBottomIn),
      textMarginLeftIn: Number(s.textMarginLeftIn),
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await confirm({ title: 'Save these custom printing settings?' });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.put('/settings/custom-print', buildUpdatePayload());
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save custom printing settings');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRestoreDefaults() {
    const ok = await confirm({
      title: 'Restore default custom printing settings?',
      message: 'This resets paper size, margins, font, size and alignment back to the factory defaults (2in x 1in, portrait, no margins, centered).',
    });
    if (!ok) return;
    setRestoring(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.del<CustomPrintSettingsRecord>('/settings/custom-print');
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
      printCustomText({ settings: currentSettings(), html: SAMPLE_HTML });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to prepare test print');
    } finally {
      setPrinting(false);
    }
  }

  const previewWidthIn = Math.min(Number(widthIn) || 2, 4);
  const previewHeightIn = Math.min(Number(heightIn) || 1, 4);

  return (
    <form onSubmit={onSubmit}>
      {error && <ErrorAlert message={error} />}
      <p className="mb-3 text-xs text-slate-500">
        Used by the &quot;Custom Print&quot; button on the Asset Register page, for printing any free-form note that
        isn&apos;t an asset tag or a condition. The note&apos;s own bold/italic/underline formatting is set when
        typing it; these settings control the paper size, margins, base font and alignment.
      </p>
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

      <p className="mb-1.5 mt-4 text-xs font-medium text-slate-600">Text font, alignment &amp; spacing</p>
      <FieldStyleFields
        idPrefix="custom"
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSizePt={fontSizePt}
        setFontSizePt={setFontSizePt}
        textAlign={textAlign}
        setTextAlign={setTextAlign}
        marginTopIn={textMarginTopIn}
        setMarginTopIn={setTextMarginTopIn}
        marginRightIn={textMarginRightIn}
        setMarginRightIn={setTextMarginRightIn}
        marginBottomIn={textMarginBottomIn}
        setMarginBottomIn={setTextMarginBottomIn}
        marginLeftIn={textMarginLeftIn}
        setMarginLeftIn={setTextMarginLeftIn}
      />

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
            className="min-w-0 leading-tight"
            style={{
              fontFamily,
              fontSize: `${fontSizePt}pt`,
              textAlign: textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify',
              margin: `${textMarginTopIn}in ${textMarginRightIn}in ${textMarginBottomIn}in ${textMarginLeftIn}in`,
              transform: orientation === 'LANDSCAPE' ? 'rotate(90deg)' : undefined,
            }}
          >
            Fragile — <b>handle with care</b>
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
