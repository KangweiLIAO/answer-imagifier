import { toSvg, getFontEmbedCSS } from 'html-to-image';
import { exportScale } from '../dom.js';
import { t } from '../i18n.js';
import { roundExport } from '../image-style.js';
import { timeout } from '../shared/timeout.js';
import { prepareSvgLayout, svgLayoutUri, findSvgContentHeight, drawSvg } from './svg-layout.js';

export async function rasterize(card, options) {
  const width = Math.ceil(card.getBoundingClientRect().width);
  const measuredHeight = Math.ceil(card.getBoundingClientRect().height);
  exportScale(width, measuredHeight, options.scale);
  let fontEmbedCSS = '';
  // Math typesetting may use web fonts that must survive the SVG image boundary.
  if (card.querySelector('[data-math]')) {
    fontEmbedCSS = await timeout(getFontEmbedCSS(card, { preferredFontFormat: 'woff2' }), 15000, t('mathFontTimeout'));
  }
  const background = options.theme === 'dark' ? '#212121' : '#ffffff';
  const uri = await toSvg(card, { width, height: measuredHeight, fontEmbedCSS, backgroundColor: background });
  const layout = prepareSvgLayout(uri);
  // Allow text to reflow, then measure its real height in SVG image context.
  // A larger probe is retried within the same canvas/memory limits; never guess
  // extra padding or crop the output back to the old DOM height.
  const maxHeight = Math.floor(Math.min(16000 / .75, 32_000_000 / (width * .75 ** 2)));
  let probeHeight = Math.min(maxHeight, Math.ceil(measuredHeight * 1.15 + 128));
  let height;
  while (true) {
    const probeRatio = exportScale(width, probeHeight, 1);
    const probe = await drawSvg(svgLayoutUri(layout, width, probeHeight), width, probeHeight, probeRatio, background);
    height = findSvgContentHeight(probe, layout, probe.height / probeHeight);
    // Release the probe allocation before producing the full-resolution PNG.
    probe.width = probe.height = 0;
    if (height !== null) break;
    if (probeHeight === maxHeight) throw new Error(t('answerTooLong'));
    probeHeight = Math.min(maxHeight, Math.ceil(probeHeight * 1.5));
  }
  layout.marker.remove();
  const ratio = exportScale(width, height, options.scale);
  const canvas = await drawSvg(svgLayoutUri(layout, width, height), width, height, ratio, background);
  roundExport(canvas, options.format, options.theme, ratio);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(t('imageFailed'))), options.format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95));
  return { blob, layoutWidth: width, width: canvas.width, height: canvas.height, reduced: ratio < options.scale - 0.01 };
}
