import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowser } from './helpers/browser.mjs';
import { loadModule } from './helpers/module.mjs';
import { preserveIframeSnapshots, requestFrameImage } from '../src/export/iframe-snapshots.js';
import { FRAME_CHANNEL, validFrameImage, visualizationOrigin } from '../src/export/frame-protocol.js';

const origin = 'https://codex-inline-visualization-test.web-sandbox.oaiusercontent.com';
const image = { ok: true, png: 'data:image/png;base64,aGVsbG8=', width: 800, height: 1200 };

test('only HTTPS visualization sandbox frames and bounded PNG payloads qualify', () => {
  assert.equal(visualizationOrigin(`${origin}/diagram`), origin);
  for (const src of ['http://x.web-sandbox.oaiusercontent.com/', 'https://web-sandbox.oaiusercontent.com/', 'https://x.web-sandbox.oaiusercontent.com.evil.test/', 'data:text/html,test']) assert.equal(visualizationOrigin(src), null);
  assert.equal(validFrameImage(image), true);
  for (const data of [{ ...image, png: 'data:image/svg+xml;base64,aA==' }, { ...image, width: -1 }, { ...image, height: 100000 }, { ...image, ok: false }]) assert.equal(validFrameImage(data), false);
});

test('frame response must match window, origin and request id; completion removes listener and timer', async () => {
  let listener, cleared = false, removed = false, request;
  const child = { postMessage: data => { request = data; } };
  const host = {
    crypto: { randomUUID: () => 'nonce' },
    addEventListener: (_, callback) => { listener = callback; },
    removeEventListener: (_, callback) => { removed = callback === listener; },
    setTimeout: () => 1, clearTimeout: () => { cleared = true; },
  };
  const pending = requestFrameImage({ src: `${origin}/`, contentWindow: child }, { host });
  const data = { ...image, channel: FRAME_CHANNEL, type: 'result', id: request.id };
  listener({ source: {}, origin, data });
  listener({ source: child, origin: 'https://evil.test', data });
  listener({ source: child, origin, data: { ...data, id: 'wrong' } });
  assert.equal(removed, false);
  listener({ source: child, origin, data });
  assert.equal(await pending, data);
  assert.equal(removed && cleared, true);
});

test('unavailable frame times out without keeping the listener', async () => {
  let listener, removed = false;
  const host = {
    crypto: { randomUUID: () => 'nonce' },
    addEventListener: (_, callback) => { listener = callback; },
    removeEventListener: (_, callback) => { removed = callback === listener; },
    setTimeout, clearTimeout,
  };
  assert.equal(await requestFrameImage({ src: origin, contentWindow: { postMessage() {} } }, { host, timeout: 1 }), null);
  assert.equal(removed, true);
});

test('successful iframe snapshot survives real cleanup and layout; failed and unsupported embeds keep warnings', async t => {
  const { document, globals } = createBrowser(t, `<main><iframe title="Overflow diagram" src="${origin}/"></iframe><iframe src="${origin}/failed"></iframe><iframe src="https://other.test/"></iframe></main>`);
  const source = document.querySelector('main');
  const clone = source.cloneNode(true);
  const originals = [...source.querySelectorAll('iframe')];
  const copies = [...clone.querySelectorAll('iframe')];
  const context = { clone, sourceByCopy: new Map(copies.map((copy, index) => [copy, originals[index]])), options: { scale: 2 }, warnings: [] };
  let calls = 0;
  await preserveIframeSnapshots(context, async () => ++calls === 1 ? image : null);
  const { cleanInteractiveContent } = await loadModule('src/export/cleanup.js', { globals });
  cleanInteractiveContent(context);
  const screenshot = clone.querySelector('[data-export-iframe-snapshot]');
  assert.equal(screenshot.alt, 'Overflow diagram');
  assert.equal(screenshot.src, image.png);
  assert.equal(clone.querySelectorAll('.asset-warning').length, 2);
  assert.equal(clone.querySelector('iframe'), null);
  assert.equal(source.querySelectorAll('iframe').length, 3);
  assert.equal(calls, 2);
  clone.className = 'answer-content';
  const { applyImageWidths } = await loadModule('src/image-width.js', { globals });
  const card = document.createElement('div'); card.append(clone);
  applyImageWidths(card, 'small');
  assert.equal(screenshot.parentElement, clone);
  assert.equal(screenshot.style.width, '100%');
});

test('frame worker ignores other windows/origins and reports capture failures', async () => {
  const { installFrameCapture } = await loadModule('src/frame-capture.js');
  let listener, captures = 0;
  const replies = [];
  const parent = { postMessage: (data, origin) => replies.push({ data, origin }) };
  const host = { parent, document: {}, addEventListener: (_, callback) => { listener = callback; } };
  installFrameCapture(host, async () => { captures++; throw new Error('Unavailable canvas'); });
  const data = { channel: FRAME_CHANNEL, type: 'capture', id: 'nonce', scale: 2 };
  await listener({ source: parent, origin: 'https://evil.test', data });
  await listener({ source: {}, origin: 'https://chatgpt.com', data });
  assert.equal(captures, 0);
  await listener({ source: parent, origin: 'https://chatgpt.com', data });
  assert.equal(captures, 1);
  assert.equal(replies[0].data.ok, false);
  assert.equal(replies[0].origin, 'https://chatgpt.com');
});

test('Skybridge wrapper resolves its full-width same-origin child and rejects inaccessible or nested embeds', async () => {
  const { frameDocument } = await loadModule('src/frame-capture.js');
  const leaf = { body: { children: [{ nodeName: 'DIV' }] }, querySelector: () => null };
  const child = { nodeName: 'IFRAME', getBoundingClientRect: () => ({ left: 0, top: 0, width: 778 }), contentDocument: leaf };
  const wrapper = { body: { children: [child] }, defaultView: { innerWidth: 778 }, querySelector: () => child };
  assert.equal(frameDocument(wrapper), leaf);
  child.contentDocument = null;
  assert.throws(() => frameDocument(wrapper), /not ready/);
  assert.throws(() => frameDocument({ body: { children: [{ nodeName: 'DIV' }] }, querySelector: () => ({}) }), /Unsupported nested/);
});
