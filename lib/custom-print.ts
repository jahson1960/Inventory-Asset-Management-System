import type { CustomPrintSettingsRecord } from './types';

export const DEFAULT_CUSTOM_PRINT_SETTINGS: CustomPrintSettingsRecord = {
  widthIn: '2',
  heightIn: '1',
  orientation: 'PORTRAIT',
  marginTopIn: '0',
  marginRightIn: '0',
  marginBottomIn: '0',
  marginLeftIn: '0',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSizePt: 10,
  textAlign: 'CENTER',
  textMarginTopIn: '0',
  textMarginRightIn: '0',
  textMarginBottomIn: '0',
  textMarginLeftIn: '0',
};

const TEXT_ALIGN_CSS: Record<string, string> = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFY: 'justify',
};

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'SPAN', 'P', 'UL', 'OL', 'LI']);

function sanitizeNode(node: Node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }
    const el = child as HTMLElement;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // Drop the tag but keep its contents (e.g. a pasted <font> or <a> wrapper) — a <script>/
      // <style> has its text content dropped too, since nothing useful survives unwrapping those.
      if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
      }
      node.removeChild(el);
      continue;
    }
    while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
    sanitizeNode(el);
  }
}

/** Strips everything except plain structure/formatting tags from rich-text editor output before
 *  it's embedded in the print window's document.write() — this content never leaves the typing
 *  user's own browser (not stored, not shared with anyone else), so the risk this guards against
 *  is low, but it costs little to keep the print window from ever executing injected markup. Runs
 *  the pass twice: unwrapping a disallowed element exposes its children as new siblings that the
 *  first pass's node snapshot won't revisit, so a second pass catches those (a no-op on content
 *  that was already clean). */
export function sanitizeRichText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  sanitizeNode(template.content);
  return template.innerHTML;
}

/** Opens a dedicated print window for a rich-text note (bold/italic/underline preserved), sized
 *  to the Custom Print template's own paper size/margins/orientation and base font/alignment —
 *  used for the "Custom Print" button on the Asset Register page, for anything that isn't an
 *  asset tag or a condition. Independent from printAssetLabel/printAssetCondition. */
export function printCustomText({ settings, html }: { settings: CustomPrintSettingsRecord; html: string }) {
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

  const textAlign = TEXT_ALIGN_CSS[settings.textAlign] ?? 'center';
  const textMarginTop = Number(settings.textMarginTopIn) || 0;
  const textMarginRight = Number(settings.textMarginRightIn) || 0;
  const textMarginBottom = Number(settings.textMarginBottomIn) || 0;
  const textMarginLeft = Number(settings.textMarginLeftIn) || 0;
  const safeHtml = sanitizeRichText(html);

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
    font-family: ${settings.fontFamily};
    font-size: ${settings.fontSizePt}pt;
    text-align: ${textAlign};
    overflow-wrap: break-word;
    line-height: 1.3;
    margin: ${textMarginTop}in ${textMarginRight}in ${textMarginBottom}in ${textMarginLeft}in;
  }
</style>
</head>
<body>
  <div class="label">
    <div class="text">${safeHtml}</div>
  </div>
</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
