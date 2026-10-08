import { toCanvas, getFontEmbedCSS } from 'html-to-image';
import { exportScale } from '../dom.js';
import { t } from '../i18n.js';
import { roundExport } from '../image-style.js';
import { timeout } from '../shared/timeout.js';

export async function rasterize(card, options) {
  const width = Math.ceil(card.getBoundingClientRect().width);
  const height = Math.ceil(card.getBoundingClientRect().height);
  const ratio = exportScale(width, height, options.scale);
  let fontEmbedCSS = '';
  // Math typesetting may use web fonts that must survive the SVG image boundary.
  if (card.querySelector('[data-math]')) {
    fontEmbedCSS = await timeout(getFontEmbedCSS(card, { preferredFontFormat: 'woff2' }), 15000, t('mathFontTimeout'));
  }
  const canvas = await toCanvas(card, {
    width, height, pixelRatio: ratio, fontEmbedCSS,
    backgroundColor: options.theme === 'dark' ? '#212121' : '#ffffff',
    skipAutoScale: true,
  });
  roundExport(canvas, options.format, options.theme, ratio);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(t('imageFailed'))), options.format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95));
  return { blob, layoutWidth: width, width: canvas.width, height: canvas.height, reduced: ratio < options.scale - 0.01 };
}
