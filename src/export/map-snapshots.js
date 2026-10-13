import { toSvg } from 'html-to-image';
import { t } from '../i18n.js';
import { MAX_FRAME_PIXELS, MAX_FRAME_DATA_LENGTH } from './frame-protocol.js';
import { timeout } from '../shared/timeout.js';
import { isNetworkImageURL, loadImageData } from '../shared/network-image.js';

export const MAP_WIDGET = '[data-testid="businesses-map-widget"]';
const MAP_CANVAS = '[data-testid="chatgpt-map-canvas"] canvas.mapboxgl-canvas';
const IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="#eeeeee"/><g fill="none" stroke="#999999" stroke-width="2"><rect x="23" y="25" width="34" height="30" rx="3"/><circle cx="33" cy="34" r="3"/><path d="M24 50l10-10 8 8 7-7 8 9"/></g></svg>')}`;

export function mapImageFallback(report) {
  return event => {
    const image = event.target;
    if (!image || image.tagName !== 'IMG') throw new Error('Map image could not be embedded');
    image.removeAttribute('srcset');
    image.src = IMAGE_PLACEHOLDER;
    report();
  };
}

export function mapResourceLoader(report, load = loadImageData) {
  const resources = new Map();
  return async url => {
    if (!isNetworkImageURL(url)) return undefined;
    if (!resources.has(url)) resources.set(url, load(url).catch(() => {
      report();
      return IMAGE_PLACEHOLDER;
    }));
    return resources.get(url);
  };
}

export function hasMapPixels(canvas) {
  if (!canvas.width || !canvas.height || canvas.width * canvas.height > MAX_FRAME_PIXELS) return false;
  const probe = canvas.ownerDocument.createElement('canvas');
  probe.width = canvas.width; probe.height = canvas.height;
  const context = probe.getContext('2d', { willReadFrequently: true });
  context.drawImage(canvas, 0, 0);
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
  // A cleared WebGL buffer is transparent black, or opaque black when alpha
  // is disabled. Neither is a usable native street-map image.
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] && (pixels[index - 3] || pixels[index - 2] || pixels[index - 1])) return true;
  }
  return false;
}

export function includeMapNode(node, showImages = true) {
  if (node.nodeType !== 1) return true;
  if (!showImages && (node.matches('img,picture') || (node.children.length === 1 && node.firstElementChild.matches('img,picture')))) return false;
  if (node.matches('script,iframe,video,audio,object,embed,.mapboxgl-touch-pan-blocker,.mapboxgl-scroll-zoom-blocker')) return false;
  if (node.matches('button,[role="button"]')) {
    // Markers and place cards carry content. Expand/zoom controls do not.
    return !!node.closest('[data-map-marker-longitude],[role="listitem"]') || node.getAttribute('aria-label') === 'Map attribution';
  }
  return true;
}

export async function inlineMapSymbols(svg, baseURI, fetchResource = fetch) {
  const resources = new Map();
  for (const use of svg.querySelectorAll('use')) {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href');
    if (!href || href.startsWith('#')) continue;
    const url = new URL(href, baseURI);
    if (url.origin !== new URL(baseURI).origin || !url.pathname.endsWith('.svg') || !url.hash) throw new Error('Unsupported map icon');
    const id = decodeURIComponent(url.hash.slice(1)); url.hash = '';
    if (!resources.has(url.href)) resources.set(url.href, fetchResource(url.href, { credentials: 'same-origin' }).then(async response => {
      if (!response.ok) throw new Error('Map icon could not be loaded');
      return new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    }));
    const symbol = (await resources.get(url.href)).getElementById(id);
    if (!symbol) throw new Error('Map icon missing');
    const group = svg.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (const attribute of use.attributes) if (!['href', 'xlink:href'].includes(attribute.name)) group.setAttribute(attribute.name, attribute.value);
    for (const child of symbol.childNodes) group.append(svg.importNode(child, true));
    // Sprite resources contribute vector shapes only, never active content.
    group.querySelectorAll('script,foreignObject,image,use,style').forEach(node => node.remove());
    for (const node of group.querySelectorAll('*')) for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
    use.replaceWith(group);
  }
}

export async function captureMapWidget(source, options) {
  const canvas = source.querySelector(MAP_CANVAS);
  if (!canvas || !hasMapPixels(canvas)) throw new Error('Map pixels unavailable');
  const { width, height } = source.getBoundingClientRect();
  if (width <= 0 || height <= 0 || width * height > MAX_FRAME_PIXELS) throw new Error('Invalid map size');
  const pixelRatio = Math.min(Math.max(1, Number(options.scale) || 2), 3, Math.sqrt(MAX_FRAME_PIXELS / (width * height)));
  let imagesBlocked = false;
  const svgURL = await toSvg(source, {
    width, height, pixelRatio, skipAutoScale: true, filter: node => includeMapNode(node, options.showImages !== false),
    preserveScrollPositions: true,
    resourceLoader: mapResourceLoader(() => { imagesBlocked = true; }),
    onImageErrorHandler: mapImageFallback(() => { imagesBlocked = true; }),
  });
  const svg = new DOMParser().parseFromString(decodeURIComponent(svgURL.slice(svgURL.indexOf(',') + 1)), 'image/svg+xml');
  await inlineMapSymbols(svg, source.ownerDocument.baseURI);
  const image = source.ownerDocument.createElement('img');
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await image.decode();
  const output = source.ownerDocument.createElement('canvas');
  output.width = Math.floor(width * pixelRatio); output.height = Math.floor(height * pixelRatio);
  output.getContext('2d').drawImage(image, 0, 0, output.width, output.height);
  const png = output.toDataURL('image/png');
  if (!png.startsWith('data:image/png;base64,') || png.length > MAX_FRAME_DATA_LENGTH) throw new Error('Invalid map image');
  return { png, width: output.width, height: output.height, imagesBlocked };
}

export async function preserveMapSnapshots({ clone, sourceByCopy, options, warnings }, capture = captureMapWidget) {
  for (const copy of clone.querySelectorAll(MAP_WIDGET)) {
    const source = sourceByCopy.get(copy);
    if (!source) continue;
    try {
      const result = await timeout(capture(source, options), 15_000, 'Map capture timed out');
      const image = clone.ownerDocument.createElement('img');
      image.src = result.png;
      image.alt = t('map');
      image.width = result.width; image.height = result.height;
      image.setAttribute('data-export-map-snapshot', '');
      image.setAttribute('data-export-flow', 'map');
      image.style.cssText = 'display:block;width:100%;height:auto;max-width:100%';
      copy.replaceWith(image);
      if (result.imagesBlocked) warnings.push(t('mapImagesBlocked'));
    } catch (error) {
      console.warn('[Answer Imagifier] Map capture failed:', error instanceof Error ? error.message : 'Map resource could not be embedded');
      const note = clone.ownerDocument.createElement('p');
      note.className = 'asset-warning'; note.textContent = t('mapBlocked');
      copy.replaceWith(note);
      warnings.push(t('mapsBlocked'));
    }
  }
}
