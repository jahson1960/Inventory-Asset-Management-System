import { fetchAuthenticatedDataUrl } from './api-client';
import type { LabelPrintSettingsRecord } from './types';

export const DEFAULT_LABEL_SETTINGS: LabelPrintSettingsRecord = {
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
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSizePt: 10,
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Opens a dedicated print window sized exactly to the given label settings (paper size,
 *  margins, orientation, layout, font) and prints it — used both for a real asset's "Print
 *  Label" button and for the Label Printing settings page's "Test Print" button (with sample
 *  data and no saved settings required). */
export async function printAssetLabel({
  settings,
  assetTag,
  assetName,
  serialNumber,
  qrCodeEnabled,
  qrCodePath,
}: {
  settings: LabelPrintSettingsRecord;
  assetTag: string;
  assetName: string;
  serialNumber: string | null;
  qrCodeEnabled: boolean;
  qrCodePath: string | null;
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
  const qrSizeIn = Math.max(Math.min(boxWidthIn, boxHeightIn) * 0.7, 0.2);

  const wantsQr = settings.includeQr && qrCodeEnabled && Boolean(qrCodePath);
  const showTag = settings.includeAssetTag;
  const showName = settings.includeName;
  const showSerial = settings.includeSerial && Boolean(serialNumber);
  const stacked = settings.layout === 'STACKED';

  let qrImgTag = '';
  if (wantsQr && qrCodePath) {
    try {
      const dataUrl = await fetchAuthenticatedDataUrl(qrCodePath);
      qrImgTag = `<img src="${dataUrl}" class="qr" alt="QR" />`;
    } catch {
      // Print the text portion of the label even if the QR image failed to load.
    }
  }
  const textHtml =
    showTag || showName || showSerial
      ? `<div class="text">
      ${showTag ? `<div class="tag">${escapeHtml(assetTag)}</div>` : ''}
      ${showName ? `<div class="name">${escapeHtml(assetName)}</div>` : ''}
      ${showSerial && serialNumber ? `<div class="serial">S/N: ${escapeHtml(serialNumber)}</div>` : ''}
    </div>`
      : '';

  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(assetTag)} label</title>
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
    flex-direction: ${stacked ? 'column' : 'row'};
    align-items: center;
    justify-content: center;
    gap: 0.08in;
    font-family: ${settings.fontFamily};
    font-size: ${settings.fontSizePt}pt;
    ${rotated ? 'transform: rotate(90deg);' : ''}
  }
  .qr { width: ${qrSizeIn}in; height: ${qrSizeIn}in; flex-shrink: 0; }
  .text { min-width: 0; line-height: 1.2; overflow: hidden; text-align: ${stacked ? 'center' : 'left'}; }
  .tag { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name, .serial { font-size: 0.82em; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
  <div class="label">
    ${qrImgTag}
    ${textHtml}
  </div>
</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
