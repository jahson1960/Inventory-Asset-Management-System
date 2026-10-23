import type { LabelOrientation, TextAlign } from './types';

/** The subset of fields a print template needs to lay out a single block of free text — both
 *  LabelPrintSettingsRecord and ConditionPrintSettingsRecord already share these exact field
 *  names (page geometry plus the "tag" field's typography, since tag is the one field every
 *  template has in common and is styled as the primary/bold field), so either settings record
 *  can be passed here directly with no conversion. */
export interface CustomPrintPageSettings {
  widthIn: string;
  heightIn: string;
  orientation: LabelOrientation;
  marginTopIn: string;
  marginRightIn: string;
  marginBottomIn: string;
  marginLeftIn: string;
  tagFontFamily: string;
  tagFontSizePt: number;
  tagTextAlign: TextAlign;
  tagMarginTopIn: string;
  tagMarginRightIn: string;
  tagMarginBottomIn: string;
  tagMarginLeftIn: string;
}

const TEXT_ALIGN_CSS: Record<string, string> = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFY: 'justify',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Opens a dedicated print window for an arbitrary block of free text, sized to the chosen
 *  template's paper size/margins/orientation and styled with that template's "tag" field font —
 *  used for anything that isn't an asset tag or a condition but should still come out of one of
 *  the two existing printers (e.g. a one-off note, a location label). Independent from
 *  printAssetLabel/printAssetCondition: this has no concept of included fields or layout, it's
 *  always exactly one block of text. */
export function printCustomText({ settings, text }: { settings: CustomPrintPageSettings; text: string }) {
  const width = Number(settings.widthIn) || 2;
  const height = Number(settings.heightIn) || 1;
  const rotated = settings.orientation === 'LANDSCAPE';
  const marginTop = Number(settings.marginTopIn) || 0;
  const marginRight = Number(settings.marginRightIn) || 0;
  const marginBottom = Number(settings.marginBottomIn) || 0;
  const marginLeft = Number(settings.marginLeftIn) || 0;
  // Rotated content needs its pre-rotation box swapped (W<->H) so the rotated bounding box ends
  // up matching the printable area instead of overflowing/underflowing it.
  const printableWidthIn = Math.max(width - marginLeft - marginRight, 0.2);
  const printableHeightIn = Math.max(height - marginTop - marginBottom, 0.2);
  const boxWidthIn = rotated ? printableHeightIn : printableWidthIn;
  const boxHeightIn = rotated ? printableWidthIn : printableHeightIn;

  const textAlign = TEXT_ALIGN_CSS[settings.tagTextAlign] ?? 'center';
  const fieldMarginTop = Number(settings.tagMarginTopIn) || 0;
  const fieldMarginRight = Number(settings.tagMarginRightIn) || 0;
  const fieldMarginBottom = Number(settings.tagMarginBottomIn) || 0;
  const fieldMarginLeft = Number(settings.tagMarginLeftIn) || 0;

  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Custom print</title>
<style>
  @page { size: ${width}in ${height}in; margin: ${marginTop}in ${marginRight}in ${marginBottom}in ${marginLeft}in; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .label {
    width: ${boxWidthIn}in;
    height: ${boxHeightIn}in;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    ${rotated ? 'transform: rotate(90deg);' : ''}
  }
  .text {
    width: 100%;
    font-family: ${settings.tagFontFamily};
    font-size: ${settings.tagFontSizePt}pt;
    text-align: ${textAlign};
    white-space: pre-wrap;
    overflow-wrap: break-word;
    line-height: 1.3;
    margin: ${fieldMarginTop}in ${fieldMarginRight}in ${fieldMarginBottom}in ${fieldMarginLeft}in;
  }
</style>
</head>
<body>
  <div class="label">
    <div class="text">${escapeHtml(text)}</div>
  </div>
</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
