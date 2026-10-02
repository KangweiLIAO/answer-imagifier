import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { applyImageWidths } from '../src/image-width.js';
test('charts follow their container and exclude math, task markers and branding', () => {
  const { document } = parseHTML('<html><body><article><img class="plugin-logo"><div class="answer-content"><div id="container"><img src="data:image/png;base64,x" data-export-source-width="320"><svg width="400" viewBox="0 0 400 200"><path/></svg><svg data-checklist-box="checked"><path/></svg><div data-math><svg/></div></div></div></article></body></html>');
  const container = document.querySelector('#container');
  Object.defineProperty(container, 'clientWidth', {value:630});
  const previous = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({paddingLeft:'10px',paddingRight:'10px'});
  try {
    const info = applyImageWidths(document.querySelector('article'), 'large');
    assert.deepEqual(info, [{index:0,width:610},{index:1,width:610}]);
    assert.equal(container.querySelectorAll('.export-image-frame').length, 2);
    assert.equal(container.querySelector('img').style.width, '100%');
    assert.equal(container.querySelector('img').style.height, 'auto');
    assert.equal(container.querySelector('[data-checklist-box]').parentElement, container);
    assert.equal(document.querySelector('.plugin-logo').parentElement.localName, 'article');
  } finally {
    globalThis.getComputedStyle = previous;
  }
});

 test('tall diagrams are bounded at each level and remain proportional', () => {
  const {document} = parseHTML('<article><div class="answer-content"><svg viewBox="0 0 400 1600"><path/></svg><svg data-export-icon viewBox="0 0 24 24"/></div></article>');
  const container = document.querySelector('.answer-content');
  Object.defineProperty(container, 'clientWidth', {value:1200});
  const previous = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({});
  try {
    for (const [size, height] of [['small',360],['standard',600],['large',900]]) {
      const clone = document.querySelector('article').cloneNode(true);
      Object.defineProperty(clone.querySelector('.answer-content'), 'clientWidth', {value:1200});
      assert.equal(applyImageWidths(clone, size)[0].width, height / 4);
      assert.equal(clone.querySelector('.export-image-frame').style.maxWidth, `${height / 4}px`);
      assert.equal(clone.querySelectorAll('.export-image-frame').length, 1);
    }
  } finally { globalThis.getComputedStyle = previous; }
});
