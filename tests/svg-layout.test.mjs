import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from 'linkedom';
import { prepareSvgLayout, svgLayoutUri, findSvgContentHeight } from '../src/export/svg-layout.js';
import { stubProperties } from './helpers/dom.mjs';
import { loadModule } from './helpers/module.mjs';

const svgUri = body => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><article xmlns="http://www.w3.org/1999/xhtml" style="height:200px;padding-left:40px;padding-bottom:24px">${body}</article></foreignObject></svg>`)}`;

test('serialized paragraphs and their wrappers reflow; graphics and controls retain measured heights', t => {
  stubProperties(t, globalThis, { DOMParser, XMLSerializer: class { serializeToString(node) { return node.toString(); } } });
  const uri = svgUri('<section style="height:44px"><p style="height:44px;width:646px">Mixed 中英文<strong>bold</strong></p></section><div class="diagram" style="height:80px"><svg style="height:80px"><text>chart</text></svg><p style="height:20px">label</p></div><div data-export-component="box" style="height:60px"><p style="height:20px">widget</p></div><div data-export-shape="" style="height:12px"><p style="height:12px">fixed</p></div><div data-export-component="grid" style="display:grid;grid-template-columns:100px 200px;grid-template-rows:20px 20px"><div data-export-component="text">card text</div></div><img data-export-map-snapshot="" style="height:300px"/><span data-export-form-control="input" style="height:30px">value</span>');
  const layout = prepareSvgLayout(uri);
  const card = layout.svg.querySelector('article');
  assert.equal(card.style.height, 'auto');
  assert.equal(card.querySelector('section').style.height, 'auto');
  assert.equal(card.querySelector('section p').style.height, 'auto');
  assert.equal(card.querySelector('section p').style.width, '646px');
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
