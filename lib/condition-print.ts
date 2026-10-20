import type { ConditionPrintSettingsRecord } from './types';

export const DEFAULT_CONDITION_SETTINGS: ConditionPrintSettingsRecord = {
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
  tagFontFamily: 'Arial, Helvetica, sans-serif',
  tagFontSizePt: 10,
  tagMarginTopIn: '0',
  tagMarginRightIn: '0',
  tagMarginBottomIn: '0',
  tagMarginLeftIn: '0',
  conditionFontFamily: 'Arial, Helvetica, sans-serif',
  conditionFontSizePt: 9,
  conditionMarginTopIn: '0',
  conditionMarginRightIn: '0',
  conditionMarginBottomIn: '0',
  conditionMarginLeftIn: '0',
  noteFontFamily: 'Arial, Helvetica, sans-serif',
  noteFontSizePt: 8,
  noteMarginTopIn: '0',
  noteMarginRightIn: '0',
  noteMarginBottomIn: '0',
  noteMarginLeftIn: '0',
};

function fieldCss(settings: ConditionPrintSettingsRecord, field: 'tag' | 'condition' | 'note'): string {
  const style =
    field === 'tag'
      ? {
          fontFamily: settings.tagFontFamily,
          fontSizePt: settings.tagFontSizePt,
          top: settings.tagMarginTopIn,
          right: settings.tagMarginRightIn,
          bottom: settings.tagMarginBottomIn,
          left: settings.tagMarginLeftIn,
        }
      : field === 'condition'
        ? {
            fontFamily: settings.conditionFontFamily,
            fontSizePt: settings.conditionFontSizePt,
            top: settings.conditionMarginTopIn,
            right: settings.conditionMarginRightIn,
            bottom: settings.conditionMarginBottomIn,
            left: settings.conditionMarginLeftIn,
          }
        : {
            fontFamily: settings.noteFontFamily,
            fontSizePt: settings.noteFontSizePt,
            top: settings.noteMarginTopIn,
            right: settings.noteMarginRightIn,
            bottom: settings.noteMarginBottomIn,
            left: settings.noteMarginLeftIn,
          };
  const top = Number(style.top) || 0;
  const right = Number(style.right) || 0;
  const bottom = Number(style.bottom) || 0;
  const left = Number(style.left) || 0;
  return `font-family:${style.fontFamily};font-size:${style.fontSizePt}pt;margin:${top}in ${right}in ${bottom}in ${left}in;`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Opens a dedicated print window sized exactly to the given condition-label settings (paper
 *  size, margins, orientation, layout, font) and prints it — used both for a real asset's "Print
 *  Condition" button and for the Condition Printing settings page's "Test Print" button (with
 *  sample data and no saved settings required). Independent from printAssetLabel/label-print.ts:
 *  this prints asset tag / condition / condition note, not tag / name / serial, and has no QR
 *  code concept at all. */
export function printAssetCondition({
  settings,
  assetTag,
  condition,
  conditionNote,
}: {
  settings: ConditionPrintSettingsRecord;
  assetTag: string;
  condition: string;
  conditionNote: string | null;
}) {
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

  const showTag = settings.includeAssetTag;
  const showCondition = settings.includeCondition;
  const showNote = settings.includeNote && Boolean(conditionNote);
  const stacked = settings.layout === 'STACKED';

  const contentHtml =
    showTag || showCondition || showNote
      ? `<div class="text">
      ${showTag ? `<div class="line clip" style="${fieldCss(settings, 'tag')}">${escapeHtml(assetTag)}</div>` : ''}
      ${showCondition ? `<div class="line clip" style="${fieldCss(settings, 'condition')}">${escapeHtml(condition)}</div>` : ''}
      ${showNote && conditionNote ? `<div class="line wrap" style="${fieldCss(settings, 'note')}">${escapeHtml(conditionNote)}</div>` : ''}
    </div>`
      : '';

  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(assetTag)} condition</title>
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
    min-width: 0;
    display: flex;
    flex-direction: ${stacked ? 'column' : 'row'};
    align-items: ${stacked ? 'center' : 'flex-start'};
    justify-content: center;
    gap: 0.08in;
    line-height: 1.25;
    text-align: ${stacked ? 'center' : 'left'};
  }
  .line { min-width: 0; }
  .clip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wrap { overflow-wrap: break-word; }
  .line:first-child { font-weight: bold; }
  .line:not(:first-child) { color: #333; }
</style>
</head>
<body>
  <div class="label">
    ${contentHtml}
  </div>
</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
