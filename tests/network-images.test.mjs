import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNetworkImageURL, fetchImageData, MAX_IMAGE_BYTES } from '../src/shared/network-image.js';
import { createBrowser } from './helpers/browser.mjs';
import { loadModule } from './helpers/module.mjs';
import { excludedContent } from '../src/content-filter.js';

test('network photo adapter preserves crop and frame dimensions but omits generated images and site icons', async t => {
  const { document, globals } = createBrowser(t, '<main><div data-d-component="box" style="width:100%;max-width:132px;aspect-ratio:4 / 5"><div data-d-component="image" style="width:100%;aspect-ratio:4 / 5"><img src="https://images.openai.com/static-rsc-4/photo" style="object-position:17.8% 50%"><div data-d-image-loading>Loading</div></div></div><div data-testid="generated-image-preview"><div data-d-component="image"><img id="generated" src="https://images.openai.com/static-rsc-4/generated"></div></div><img id="favicon" src="https://example.com/favicon.png"></main>');
  const source = document.querySelector('main'); const before = source.outerHTML;
  const omitted = excludedContent(source);
  assert.equal(omitted.has(source.querySelector('img')), false);
  assert.ok(omitted.has(source.querySelector('#generated')));
  assert.ok(omitted.has(source.querySelector('#favicon')));
  const { createSnapshot } = await loadModule('src/export/snapshot.js', { globals });
  const { preserveNetworkImages } = await loadModule('src/export/adapters/network-images.js', { globals });
  const context = createSnapshot(source, [], {});
  preserveNetworkImages(context);
  const image = context.clone.querySelector('[data-export-network-image]');
  assert.equal(image.style.objectPosition, '17.8% 50%');
  assert.equal(image.parentElement.parentElement.style.maxWidth, '132px');
  assert.equal(image.parentElement.style.aspectRatio, '4 / 5');
  assert.equal(context.clone.querySelector('[data-d-image-loading]'), null);
  assert.equal(source.outerHTML, before);
});

test('image worker only accepts approved ChatGPT tabs and public image proxy paths', async () => {
  const { allowedImageRequest } = await loadModule('src/image-worker.js', { globals: { URL, chrome: { runtime: { onMessage: { addListener() {} } } } } });
  const sender = { frameId: 0, tab: { url: 'https://chatgpt.com/c/example' } };
  const message = { type: 'answer-imagifier:network-image', url: 'https://images.openai.com/static-rsc-4/photo?purpose=inline' };
  assert.equal(allowedImageRequest(message, sender), true);
  for (const url of ['http://images.openai.com/static-rsc-4/photo', 'https://images.openai.com.evil.test/static-rsc-4/photo', 'https://images.openai.com/private', 'https://user:pass@images.openai.com/static-rsc-4/photo']) assert.equal(isNetworkImageURL(url), false);
  assert.equal(allowedImageRequest(message, { ...sender, frameId: 1 }), false);
  assert.equal(allowedImageRequest(message, { ...sender, tab: { url: 'https://other.test/' } }), false);
});

test('image requests omit credentials, reject redirects and bound MIME and response size', async () => {
  let init;
  const data = await fetchImageData('https://images.openai.com/static-rsc-4/photo', async (_, options) => { init = options; return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }); });
  assert.equal(data, 'data:image/png;base64,AQID');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.redirect, 'error');
  assert.equal(init.referrerPolicy, 'no-referrer');
  await assert.rejects(fetchImageData('url', async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })), /unavailable/);
  await assert.rejects(fetchImageData('url', async () => new Response('', { headers: { 'content-type': 'image/png', 'content-length': String(MAX_IMAGE_BYTES + 1) } })), /too large/);
  let cancelled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_IMAGE_BYTES + 1)); }, cancel() { cancelled = true; } });
  await assert.rejects(fetchImageData('url', async () => new Response(body, { headers: { 'content-type': 'image/png' } })), /too large/);
  assert.equal(cancelled, true);
});

test('resource preparation embeds the worker image and preserves readable failure layout', async t => {
  const { document, globals } = createBrowser(t, '<main><div><div data-export-network-image-frame style="aspect-ratio:4 / 5"><img data-export-network-image src="https://images.openai.com/static-rsc-4/photo"></div></div></main>');
  let fail = false; let decodes = 0;
  const image = document.querySelector('img'); image.decode = async () => { decodes++; };
  const { prepareImages } = await loadModule('src/export/resources.js', {
    globals: { ...globals, setTimeout, clearTimeout },
    mocks: { 'src/export/mermaid': { default: {} }, 'src/shared/network-image.js': { loadImageData: async () => { if (fail) throw new Error('Unavailable'); return 'data:image/png;base64,AQID'; } } },
  });
  const warnings = [];
  await prepareImages(document.querySelector('main'), warnings);
  assert.equal(image.src, 'data:image/png;base64,AQID');
  assert.equal(decodes, 1);
  assert.equal(warnings.length, 0);
  image.src = 'https://images.openai.com/static-rsc-4/photo'; fail = true;
  const copy = document.querySelector('main').cloneNode(true);
  await prepareImages(copy, warnings);
  assert.ok(copy.querySelector('[data-export-image-placeholder]'));
  assert.equal(copy.querySelector('img'), null);
  assert.equal(warnings.length, 1);
  const hidden = document.querySelector('main').cloneNode(true);
  await prepareImages(hidden, [], { showImages: false });
  assert.equal(hidden.querySelector('[data-export-network-image-frame]'), null);
});
