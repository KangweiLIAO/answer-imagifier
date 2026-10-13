import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser } from './helpers/browser.mjs';
import { loadModule } from './helpers/module.mjs';
import { installMapBufferCapture } from '../src/map-buffer.js';

const widget = '<div data-testid="businesses-map-widget"><div data-testid="chatgpt-map-canvas"><canvas class="mapboxgl-canvas"></canvas><div data-map-marker-longitude="1"><button>1</button><span aria-hidden="true">Place</span></div><div class="mapboxgl-scroll-zoom-blocker">Zoom tip</div></div><div role="listitem"><button>Place card</button></div><button aria-label="Expand map">Expand</button></div>';

test('context hook only preserves native Mapbox WebGL buffers without mutating caller options', () => {
  const calls = [];
  const prototype = { getContext(...args) { calls.push({ node: this, args }); return 'context'; } };
  installMapBufferCapture(prototype);
  const map = { matches: () => true, closest: () => ({}) };
  const ordinary = { matches: () => false };
  const attrs = { antialias: true, preserveDrawingBuffer: false };
  assert.equal(prototype.getContext.call(map, 'webgl2', attrs), 'context');
  assert.equal(calls[0].args[1].preserveDrawingBuffer, true);
  assert.equal(calls[0].args[1].antialias, true);
  assert.equal(attrs.preserveDrawingBuffer, false);
  prototype.getContext.call(ordinary, 'webgl', attrs);
  assert.equal(calls[1].args[1], attrs);
  prototype.getContext.call(map, '2d', attrs);
  assert.equal(calls[2].args[1], attrs);
});

test('map capture keeps marker buttons, aria-hidden labels and place cards while omitting gesture and expand controls', async t => {
  const { document, globals } = createBrowser(t, widget);
  const { includeMapNode } = await loadModule('src/export/map-snapshots.js', { globals });
  for (const node of document.querySelectorAll('[data-map-marker-longitude] button,[aria-hidden], [role=listitem] button')) assert.equal(includeMapNode(node), true);
  assert.equal(includeMapNode(document.querySelector('.mapboxgl-scroll-zoom-blocker')), false);
  assert.equal(includeMapNode(document.querySelector('[aria-label="Expand map"]')), false);
});

test('map replaces the whole widget before cleanup; transparent/unreadable map becomes a visible note', async t => {
  const { document, globals } = createBrowser(t, `<main>${widget}</main>`);
  const source = document.querySelector('main');
  const clone = source.cloneNode(true);
  const original = source.querySelector('[data-testid="businesses-map-widget"]');
  const copy = clone.querySelector('[data-testid="businesses-map-widget"]');
  const context = { clone, sourceByCopy: new Map([[copy, original]]), options: { scale: 2 }, warnings: [] };
  const { preserveMapSnapshots } = await loadModule('src/export/map-snapshots.js', { globals: { ...globals, setTimeout, clearTimeout } });
  const { cleanInteractiveContent } = await loadModule('src/export/cleanup.js', { globals });
  const before = source.outerHTML;
  await preserveMapSnapshots(context, async () => ({ png: 'data:image/png;base64,aGVsbG8=', width: 1280, height: 800 }));
  cleanInteractiveContent(context);
  assert.ok(clone.querySelector('img[data-export-map-snapshot]'));
  assert.equal(clone.querySelector('canvas,button,[aria-hidden]'), null);
  assert.equal(context.warnings.length, 0);
  assert.equal(source.outerHTML, before);
  context.clone = source.cloneNode(true);
  context.sourceByCopy = new Map([[context.clone.querySelector('[data-testid="businesses-map-widget"]'), original]]);
  await preserveMapSnapshots(context, async () => { throw new Error('Empty buffer'); });
  assert.ok(context.clone.querySelector('.asset-warning').textContent.includes('Map pixels'));
  assert.equal(context.clone.querySelector('canvas,button'), null);
  assert.equal(context.warnings.length, 1);
});

test('alpha validation rejects a cleared buffer even when Canvas export would not throw', async () => {
  const { hasMapPixels } = await loadModule('src/export/map-snapshots.js');
  let pixels = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0]);
  const canvas = { width: 2, height: 1, ownerDocument: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) }) } };
  assert.equal(hasMapPixels(canvas), false);
  pixels[7] = 255;
  assert.equal(hasMapPixels(canvas), false); // alpha-disabled cleared buffer
  pixels[4] = 80;
  assert.equal(hasMapPixels(canvas), true);
  canvas.width = 0;
  assert.equal(hasMapPixels(canvas), false);
});

test('map SVG sprite references are embedded once and contribute no active content', async t => {
  const { document, window, globals } = createBrowser(t, '<svg><use href="/icons.svg#rating" fill="black"></use><use href="/icons.svg#rating"></use></svg>');
  const { inlineMapSymbols } = await loadModule('src/export/map-snapshots.js', { globals: { ...globals, DOMParser: window.DOMParser, URL } });
  let requests = 0;
  await inlineMapSymbols(document, 'https://chatgpt.com/c/example', async url => {
    requests++; assert.equal(url, 'https://chatgpt.com/icons.svg');
    return { ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="rating"><path d="M0 0L8 8" onclick="bad()"/><script>bad()</script></symbol></svg>' };
  });
  assert.equal(requests, 1);
  assert.equal(document.querySelectorAll('svg path').length, 2);
  assert.equal(document.querySelector('use,script,[onclick]'), null);
  document.querySelector('svg').innerHTML = '<use href="https://other.test/icons.svg#rating"></use>';
  await assert.rejects(inlineMapSymbols(document, 'https://chatgpt.com/', async () => { throw new Error('Must not fetch'); }), /Unsupported map icon/);
});

test('a native map still loading without a Canvas also gets an explicit fallback', async t => {
  const { document, globals } = createBrowser(t, '<main><div data-testid="businesses-map-widget"><button>Loading map</button></div></main>');
  const source = document.querySelector('main'); const clone = source.cloneNode(true);
  const context = { clone, sourceByCopy: new Map([[clone.firstElementChild, source.firstElementChild]]), options: { scale: 2 }, warnings: [] };
  const { preserveMapSnapshots } = await loadModule('src/export/map-snapshots.js', { globals: { ...globals, setTimeout, clearTimeout } });
  await preserveMapSnapshots(context);
  assert.ok(clone.querySelector('.asset-warning'));
  assert.equal(clone.querySelector('button'), null);
  assert.equal(context.warnings.length, 1);
});

test('unreadable place thumbnails get a self-contained placeholder in the capture clone', async t => {
  const { document, globals } = createBrowser(t, '<img src="https://images.test/photo" srcset="https://images.test/large 2x">');
  const source = document.querySelector('img'); const copy = source.cloneNode(true);
  const { mapImageFallback } = await loadModule('src/export/map-snapshots.js', { globals });
  let reported = 0;
  const fallback = mapImageFallback(() => { reported++; });
  fallback({ target: copy });
  assert.ok(copy.src.startsWith('data:image/svg+xml;'));
  assert.equal(copy.hasAttribute('srcset'), false);
  assert.equal(source.getAttribute('src'), 'https://images.test/photo');
  assert.equal(reported, 1);
  assert.throws(() => fallback({ target: document.createElement('div') }), /could not be embedded/);
});

test('partial thumbnail failure keeps the map and reports a thumbnail warning', async t => {
  const { document, globals } = createBrowser(t, `<main>${widget}</main>`);
  const source = document.querySelector('main'); const clone = source.cloneNode(true);
  const context = { clone, sourceByCopy: new Map([[clone.firstElementChild, source.firstElementChild]]), options: { scale: 2 }, warnings: [] };
  const { preserveMapSnapshots } = await loadModule('src/export/map-snapshots.js', { globals: { ...globals, setTimeout, clearTimeout } });
  await preserveMapSnapshots(context, async () => ({ png: 'data:image/png;base64,aGVsbG8=', width: 1280, height: 800, imagesBlocked: true }));
  assert.ok(clone.querySelector('[data-export-map-snapshot]'));
  assert.equal(clone.querySelector('.asset-warning'), null);
  assert.equal(context.warnings.length, 1);
  assert.match(context.warnings[0], /thumbnails/);
});

test('map photos use the restricted image loader, reuse results and report expected failures separately', async () => {
  const { mapResourceLoader } = await loadModule('src/export/map-snapshots.js', { globals: { URL } });
  let calls = 0; let failures = 0;
  const loader = mapResourceLoader(() => { failures++; }, async url => { calls++; if (url.endsWith('bad')) throw new Error('Network unavailable'); return 'data:image/png;base64,AQID'; });
  const good = 'https://images.openai.com/static-rsc-4/good';
  assert.equal(await loader(good), 'data:image/png;base64,AQID');
  await loader(good); assert.equal(calls, 1);
  assert.equal(await loader('https://other.test/photo.png'), undefined);
  const fallback = await loader('https://images.openai.com/static-rsc-4/bad');
  assert.ok(fallback.startsWith('data:image/svg+xml;'));
  assert.equal(failures, 1);
});

test('hiding map photos keeps the map canvas, numbered markers and card text', async t => {
  const { document, globals } = createBrowser(t, `${widget}<span id="photo"><img></span>`);
  const { includeMapNode } = await loadModule('src/export/map-snapshots.js', { globals });
  assert.equal(includeMapNode(document.querySelector('#photo'), false), false);
  assert.equal(includeMapNode(document.querySelector('img'), false), false);
  for (const node of document.querySelectorAll('canvas,[data-map-marker-longitude] button,[role=listitem] button')) assert.equal(includeMapNode(node, false), true);
});
