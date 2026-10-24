'use client';

import type { TextAlign } from '@/lib/types';
import { Field, Label, Select, Input } from '@/components/ui/input';

export const FONT_OPTIONS = [
  'Arial, Helvetica, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Courier New", Courier, monospace',
  'Tahoma, Geneva, sans-serif',
];

export const TEXT_ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: 'LEFT', label: 'Left' },
  { value: 'CENTER', label: 'Center' },
  { value: 'RIGHT', label: 'Right' },
  { value: 'JUSTIFY', label: 'Justify' },
];

/** One field's font + alignment + margin controls — shared by the Label, Condition and Custom
 *  print settings tabs so each printable field can be styled independently instead of sharing
 *  one template-wide font. */
export function FieldStyleFields({
  title,
  fontFamily,
  setFontFamily,
  fontSizePt,
  setFontSizePt,
  textAlign,
  setTextAlign,
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
  title?: string;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontSizePt: number;
  setFontSizePt: (v: number) => void;
  textAlign: TextAlign;
  setTextAlign: (v: TextAlign) => void;
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
      {title && <p className="mb-2 text-xs font-semibold text-slate-700">{title}</p>}
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
      <Field>
        <Label htmlFor={`${idPrefix}-align`}>Alignment</Label>
        <Select id={`${idPrefix}-align`} value={textAlign} onChange={(e) => setTextAlign(e.target.value as TextAlign)}>
          {TEXT_ALIGN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
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
