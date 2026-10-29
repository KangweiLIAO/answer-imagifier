import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from 'linkedom';
import { prepareSvgLayout, svgLayoutUri, findSvgContentHeight } from '../src/export/svg-layout.js';
import { stubProperties } from './helpers/dom.mjs';
import { loadModule } from './helpers/module.mjs';

const svgUri = body => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><article xmlns="http://www.w3.org/1999/xhtml" style="height:200px;padding-left:40px;padding-bottom:24px">${body}</article></foreignObject></svg>`)}`;

test('structured row labels recover intrinsic widths while schedule columns retain their geometry', t => {
  stubProperties(t, globalThis, { DOMParser });
  const layout = prepareSvgLayout(svgUri(`<div data-export-component="row" style="display:flex;justify-content:space-between;height:22px">
    <p data-export-component="text" style="width:68px;height:22px">10/20 周二</p>
    <p data-export-component="text" style="width:27px;height:22px">准备</p>
  </div><div data-export-component="row" style="display:flex">
    <div data-export-component="box" data-d-has-width="" data-export-width="100px" style="width:100px"><p data-export-component="text" style="width:100px">今天</p></div>
    <div data-export-component="box" style="width:500px;flex:1 1 0%"><p>确认保险和租赁订单</p></div>
  </div>`));
  const rows = layout.svg.querySelectorAll('[data-export-component=row]');
  for (const text of rows[0].children) assert.equal(text.style.width, 'auto');
  assert.equal(rows[0].style.justifyContent, 'space-between');
  assert.equal(rows[1].firstElementChild.style.width, '100px');
  assert.equal(rows[1].querySelector('p').style.width, 'auto');
  assert.equal(rows[1].lastElementChild.style.width, 'auto');
});

test('natural widths recover across centered columns and nested wrappers while authored sizing and tables stay intact', t => {
  stubProperties(t, globalThis, { DOMParser });
  const layout = prepareSvgLayout(svgUri(`<div data-export-component="grid-item" style="width:210px">
    <div data-export-component="box" style="display:flex;flex-direction:column;align-items:center;width:210px">
      <h1 style="width:42px">127</h1><div id="wrapper" style="width:65px"><p style="width:65px"><span>不同的中文标签</span></p></div>
    </div>
  </div><p id="link" style="width:230px"><span data-export-width="max-content" style="width:210px"><span>Export report</span><svg style="width:16px;height:16px"/></span></p>
  <div id="fixed" data-export-width="7.25em" style="width:116px">Fixed text column</div>
  <div id="percent" data-export-width="37%" style="width:251px">Proportional column</div>
  <table style="width:680px"><tr><td data-export-width="40%" style="width:272px"><p style="width:252px">Table text</p></td></tr></table>`));
  for (const selector of ['[data-export-component=grid-item]', '[data-export-component=box]', 'h1', '#wrapper', '#wrapper p', '#link', 'td p']) {
    assert.equal(layout.svg.querySelector(selector).style.width, 'auto', selector);
  }
  assert.equal(layout.svg.querySelector('#link>span').style.width, 'max-content');
  assert.equal(layout.svg.querySelector('#link svg').style.width, '16px');
  assert.equal(layout.svg.querySelector('#fixed').style.width, '7.25em');
  assert.equal(layout.svg.querySelector('#percent').style.width, '37%');
  assert.equal(layout.svg.querySelector('[data-export-component=box]').style.alignItems, 'center');
  assert.equal(layout.svg.querySelector('table').style.width, '680px');
  assert.equal(layout.svg.querySelector('td').style.width, '272px');
});

test('text controls reflow inside their explicit field widths while icons, sliders and legacy fixed controls retain geometry', t => {
  stubProperties(t, globalThis, {DOMParser});
  const layout = prepareSvgLayout(svgUri(`<div data-export-form-control="segmented" data-export-form-text="" data-export-width="100%" style="height:34px;width:500px;display:flex">
    <span data-export-form-control="segment" data-export-form-text="" style="height:34px;width:80px;flex:1 1 0%">Short</span>
    <span data-export-form-control="segment" data-export-form-text="" style="height:34px;width:106px;flex:1 1 0%">多行也应完整显示的任意标签</span>
  </div><span data-export-form-control="select" data-export-form-text="" data-export-width="100%" style="height:32px;width:500px">Long selection
    <svg data-export-form-control="arrow" style="height:8px;width:14px;position:absolute"/>
  </span><div data-export-form-control="textarea" data-export-form-text="" data-export-width="100%" style="height:80px;min-height:80px;width:500px">Value</div>
  <div data-export-form-control="slider" style="height:40px;width:200px"><span style="width:20px;height:10px">10</span></div>
  <span data-export-form-control="input" style="height:30px;width:120px">Fixed legacy field</span>`));
  for (const node of layout.svg.querySelectorAll('[data-export-form-text]')) {
    assert.equal(node.style.height, 'auto');
    assert.equal(node.style.width, node.getAttribute('data-export-width') || 'auto');
  }
  assert.ok([...layout.svg.querySelectorAll('[data-export-form-control=segment]')].every(node => node.style.flex === '1 1 0%'));
  assert.equal(layout.svg.querySelector('[data-export-form-control=textarea]').style.minHeight, '80px');
  const arrow = layout.svg.querySelector('svg');
  assert.equal(arrow.style.height, '8px');
  assert.equal(arrow.style.width, '14px');
  assert.equal(arrow.style.position, 'absolute');
  assert.equal(layout.svg.querySelector('[data-export-form-control=slider]').style.height, '40px');
  assert.equal(layout.svg.querySelector('[data-export-form-control=slider] span').style.width, '20px');
  assert.equal(layout.svg.querySelector('[data-export-form-control=input]').style.height, '30px');
});

test('serialized paragraphs and their wrappers reflow; graphics and controls retain measured heights', t => {
  stubProperties(t, globalThis, { DOMParser, XMLSerializer: class { serializeToString(node) { return node.toString(); } } });
  const uri = svgUri('<section style="height:44px"><p style="height:44px;width:646px">Mixed 中英文<strong>bold</strong></p></section><div class="diagram" style="height:80px"><svg style="height:80px"><text>chart</text></svg><p style="height:20px">label</p></div><div data-export-component="box" style="height:60px"><p style="height:20px">widget</p></div><div data-export-shape="" style="height:12px"><p style="height:12px">fixed</p></div><div data-export-component="grid" style="display:grid;grid-template-columns:100px 200px;grid-template-rows:20px 20px"><div data-export-component="text">card text</div></div><img data-export-map-snapshot="" style="height:300px"/><span data-export-form-control="input" style="height:30px">value</span>');
  const layout = prepareSvgLayout(uri);
  const card = layout.svg.querySelector('article');
  assert.equal(card.style.height, 'auto');
  assert.equal(card.querySelector('section').style.height, 'auto');
  assert.equal(card.querySelector('section p').style.height, 'auto');
  assert.equal(card.querySelector('section p').style.width, 'auto');
  assert.equal(card.querySelector('strong').textContent, 'bold');
  assert.equal(card.querySelector('.diagram').style.height, '80px');
  assert.equal(card.querySelector('.diagram p').style.height, '20px');
  assert.equal(card.querySelector('[data-export-component=box] p').style.height, 'auto');
  assert.equal(card.querySelector('[data-export-shape]').style.height, '12px');
  const grid = card.querySelector('[data-export-component=grid]');
  assert.equal(grid.style.getPropertyValue('grid-template-rows'), 'none');
  assert.equal(grid.style.getPropertyValue('grid-template-columns'), '100px 200px');
  assert.equal(card.querySelector('img').style.height, '300px');
  assert.equal(card.querySelector('[data-export-form-control]').style.height, '30px');
  assert.equal(layout.markerX, 44);
  layout.marker.remove();
  const output = decodeURIComponent(svgLayoutUri(layout, 760, 300).split(',')[1]);
  assert.match(output, /viewBox="0 0 760 300"/);
  assert.ok(!output.includes('rgb(1,254,2)'), 'Probe marker must not enter final SVG');
  assert.ok(decodeURIComponent(uri).includes('height:44px'), 'Input SVG stays unchanged');
});

test('end measurement handles fractional boundaries and scaling, and rejects missing or single-color markers', () => {
  for (const ratio of [.75, 1, 2]) {
    const pixels = new Uint8ClampedArray(200 * 4);
    const paint = (row, rgb) => pixels.set([...rgb, 255], row * 4);
    const canvas = { height: 200, getContext: () => ({ getImageData: () => ({ data: pixels }) }) };
    assert.equal(findSvgContentHeight(canvas, { markerX: 44, bottomInset: 24 }, ratio), null);
    paint(100, [1, 254, 2]); paint(101, [1, 254, 2]);
    assert.equal(findSvgContentHeight(canvas, { markerX: 44, bottomInset: 24 }, ratio), null);
    paint(102, [128, 127, 128]); // antialiased boundary
    paint(103, [253, 1, 254]); paint(104, [253, 1, 254]);
    assert.equal(findSvgContentHeight(canvas, { markerX: 44, bottomInset: 24 }, ratio), Math.ceil(100 / ratio + 24));
  }
});

test('checklist labels and untagged text wrappers reflow while their markers stay fixed', t => {
  stubProperties(t, globalThis, { DOMParser });
  const layout = prepareSvgLayout(svgUri(`<section style="height:80px">
    <div data-export-checklist-row="" style="display:flex;height:22px">
      <svg data-component-checkbox="" style="height:15px;width:15px"><circle r="7"/></svg>
      <label style="height:22px"><span style="height:22px"><span>准备 60–90 秒英文 </span><span>Self-introduction</span></span></label>
    </div>
    <div id="plain" style="height:22px">Text without a paragraph element <strong>加粗文字</strong></div>
    <div data-export-shape="" style="height:8px;width:45%"></div>
    <span data-export-form-control="input" style="height:30px">Input value</span>
  </section>`));
  const card = layout.svg.querySelector('article');
  for (const selector of ['section', '[data-export-checklist-row]', 'label', 'label>span', '#plain']) {
    assert.equal(card.querySelector(selector).style.height, 'auto', selector);
  }
  assert.equal(card.querySelector('svg').style.height, '15px');
  assert.equal(card.querySelector('svg').style.width, '15px');
  assert.equal(card.querySelector('[data-export-shape]').style.height, '8px');
  assert.equal(card.querySelector('[data-export-shape]').style.width, '45%');
  assert.equal(card.querySelector('[data-export-form-control]').style.height, '30px');
});

test('rasterization retries a clipped probe and uses the measured height for the clean final render', async () => {
  const calls = [];
  let probes = 0;
  let removed = false;
  const card = { getBoundingClientRect: () => ({ width: 760, height: 100 }), querySelector: () => null };
  const { rasterize } = await loadModule('src/export/rasterize.js', { mocks: {
    'src/export/html-to-image': { toSvg: async () => 'svg', getFontEmbedCSS: async () => '' },
    'src/image-style.js': { roundExport() {} },
    'src/export/svg-layout.js': {
      prepareSvgLayout: () => ({ marker: { remove() { removed = true; } } }),
      svgLayoutUri: () => removed ? 'final' : 'probe',
      findSvgContentHeight: () => ++probes === 1 ? null : 175,
      drawSvg: async (uri, width, height, ratio) => {
        calls.push({ uri, width, height, ratio });
        return { width: width * ratio, height: height * ratio, toBlob(resolve) { resolve('png'); } };
      },
    },
  } });
  const result = await rasterize(card, { theme: 'light', format: 'png', scale: 2 });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].uri, 'probe');
  assert.ok(calls[1].height > calls[0].height);
  assert.equal(calls[2].uri, 'final');
  assert.equal(calls[2].height, 175);
  assert.equal(result.width, 1520);
  assert.equal(result.height, 350);
  assert.equal(result.reduced, false);
});

test('an undetectable end fails within allocation limits instead of exporting clipped content', async () => {
  let calls = 0;
  const card = { getBoundingClientRect: () => ({ width: 760, height: 100 }), querySelector: () => null };
  const { rasterize } = await loadModule('src/export/rasterize.js', { mocks: {
    'src/export/html-to-image': { toSvg: async () => 'svg', getFontEmbedCSS: async () => '' },
    'src/export/svg-layout.js': {
      prepareSvgLayout: () => ({}), svgLayoutUri: () => 'probe', findSvgContentHeight: () => null,
      drawSvg: async (uri, width, height, ratio) => {
        calls++;
        assert.ok(width * ratio <= 16000);
        assert.ok(height * ratio <= 16000);
        assert.ok(width * height * ratio * ratio <= 32_000_000 + 1);
        return { width: Math.floor(width * ratio), height: Math.floor(height * ratio) };
      },
    },
  } });
  await assert.rejects(rasterize(card, { theme: 'light', format: 'png', scale: 2 }), /size limit|回答过长/);
  assert.ok(calls < 15);
});
