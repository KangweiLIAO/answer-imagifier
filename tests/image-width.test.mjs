import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, stubProperties } from './helpers/dom.mjs';
import { applyImageWidths } from '../src/image-width.js';
test('charts follow their container and exclude math, task markers and branding', t => {
  const { document } = createDOM('<html><body><article><img class="plugin-logo"><div class="answer-content"><div id="container"><img src="data:image/png;base64,x" data-export-source-width="320"><svg width="400" viewBox="0 0 400 200"><path/></svg><svg data-checklist-box="checked"><path/></svg><div data-math><svg/></div></div></div></article></body></html>');
  const container = document.querySelector('#container');
  Object.defineProperty(container, 'clientWidth', {value:630});
  stubProperties(t, globalThis, { getComputedStyle: () => ({ paddingLeft: '10px', paddingRight: '10px' }) });
  const info = applyImageWidths(document.querySelector('article'), 'large');
  assert.deepEqual(info, [{index:0,width:610},{index:1,width:610}]);
  assert.equal(container.querySelectorAll('.export-image-frame').length, 2);
  assert.equal(container.querySelector('img').style.width, '100%');
  assert.equal(container.querySelector('img').style.height, 'auto');
  assert.equal(container.querySelector('[data-checklist-box]').parentElement, container);
  assert.equal(document.querySelector('.plugin-logo').parentElement.localName, 'article');
});

test('tall diagrams are bounded at each level and remain proportional', t => {
  const {document} = createDOM('<article><div class="answer-content"><svg viewBox="0 0 400 1600"><path/></svg><svg data-export-icon viewBox="0 0 24 24"/></div></article>');
  const container = document.querySelector('.answer-content');
  Object.defineProperty(container, 'clientWidth', {value:1200});
  stubProperties(t, globalThis, { getComputedStyle: () => ({}) });
  for (const [size, height] of [['small',360],['standard',600],['large',900]]) {
    const clone = document.querySelector('article').cloneNode(true);
    Object.defineProperty(clone.querySelector('.answer-content'), 'clientWidth', {value:1200});
    assert.equal(applyImageWidths(clone, size)[0].width, height / 4);
    assert.equal(clone.querySelector('.export-image-frame').style.maxWidth, `${height / 4}px`);
    assert.equal(clone.querySelectorAll('.export-image-frame').length, 1);
  }
});

test('component media retains authored size at every diagram preset while standalone charts keep scaling', t => {
  const {document} = createDOM('<article><div class="answer-content"><div data-export-component="grid"><div data-export-component="grid-item"><div data-d-clip="true"><img data-export-media style="width:100%;aspect-ratio:16 / 9"><svg data-export-media viewBox="0 0 320 180" style="width:50%"/></div></div><div><img data-export-network-image style="width:100%"></div></div><div id="standalone"><svg viewBox="0 0 400 200"/></div></div></article>');
  stubProperties(t, globalThis, {getComputedStyle: () => ({})});
  for (const [size, fraction] of [['small',.7],['standard',.85],['large',1]]) {
    const card = document.querySelector('article').cloneNode(true);
    Object.defineProperty(card.querySelector('#standalone'), 'clientWidth', {value:600});
    const result = applyImageWidths(card, size);
    assert.equal(result.length, 1);
    assert.equal(result[0].width, 600 * fraction);
    assert.equal(card.querySelectorAll('.export-image-frame').length, 1);
    assert.equal(card.querySelector('[data-export-media]').style.width, '100%');
    assert.equal(card.querySelector('svg[data-export-media]').style.width, '50%');
    assert.equal(card.querySelector('[data-export-media]').closest('.export-image-frame'), null);
  }
});
