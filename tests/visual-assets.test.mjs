import {test} from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, cloneForAdapter, stubProperties } from './helpers/dom.mjs';
import {preserveVisualAssets} from '../src/export/adapters/visual-assets.js';
import {preserveComponents} from '../src/export/adapters/components.js';
import {applyImageWidths} from '../src/image-width.js';

const markup = '<p>Visit <a href="https://example.com">hyperlinks <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 18 18 6"/></svg></a> for details.</p><div data-d-component="box" data-d-has-border style="border:1px solid rgb(220,160,40)"><div style="display:flex;flex-direction:row;gap:8px"><svg viewBox="0 0 24 24" width="18" height="18"><path/></svg><strong>Warning</strong></div><p>Validate user input.</p></div><svg data-d-component="svg" viewBox="0 0 24 24" width="24" height="24"><path/></svg><svg viewBox="0 0 320 234"><text>Client</text></svg>';

test('link and callout icons remain inline while explicit and text-bearing charts scale', t => {
  const {document} = createDOM(`<html><body><div class="answer-content">${markup}</div></body></html>`);
  const source = document.querySelector('.answer-content');
  source.querySelectorAll('svg').forEach(svg=>{svg.getBoundingClientRect=()=>({width:Number(svg.getAttribute('width'))||320,height:Number(svg.getAttribute('height'))||234});});
  const { clone, map } = cloneForAdapter(source, { stripStyles: true, stripClasses: true });
  clone.classList.add('answer-content');
  const readStyle=source=>({getPropertyValue: property=>({
    'font-size':'16px',color:'rgb(13,13,13)',display:source.style.display||'block',
    'flex-direction':source.style.getPropertyValue('flex-direction')||'column',gap:'8px',
    'border-top-color':source.hasAttribute('data-d-has-border')?'rgb(220,160,40)':'rgb(220,220,220)',
  }[property]||'')});
  preserveVisualAssets(clone,map,readStyle);
  preserveComponents(clone,map,readStyle);
  assert.equal(clone.querySelectorAll('[data-export-icon]').length,2);
  assert.equal(clone.querySelector('a svg').style.width,'1.125em');
  assert.equal(clone.querySelectorAll('[data-export-icon-row]').length,1);
  assert.equal(clone.querySelector('[data-d-has-border]').style.borderColor,'rgb(220,160,40)');
  stubProperties(t, globalThis, { getComputedStyle: () => ({ paddingLeft: '0px', paddingRight: '0px' }) });
  document.body.append(clone);
  applyImageWidths(document.body);
  assert.equal(clone.querySelectorAll('.export-image-frame').length, 2);
  assert.equal(clone.querySelector('a svg').parentElement.localName, 'a');
  assert.equal(clone.querySelector('[data-export-icon-row] svg').style.width, '1.125em');
});

test('anonymous icon rows retain main and cross axis alignment instead of forcing one layout', () => {
  for (const justify of ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']) {
    const {document} = createDOM(`<main><div style="display:flex;flex-direction:row;justify-content:${justify};align-items:baseline;gap:0px"><svg data-d-component="icon" viewBox="0 0 24 24"><path/></svg><span>Unrelated label</span></div></main>`);
    const source = document.querySelector('main');
    const before = source.outerHTML;
    const {clone, map} = cloneForAdapter(source, {stripStyles: true, stripClasses: true});
    preserveVisualAssets(clone, map, element => ({getPropertyValue: name => name === 'font-size' ? '16px' : element.style.getPropertyValue(name) || ''}));
    const row = clone.querySelector('[data-export-icon-row]');
    assert.equal(row.style.justifyContent, justify);
    assert.equal(row.style.alignItems, 'baseline');
    assert.equal(row.style.gap, '0px');
    assert.equal(clone.querySelector('svg').style.flex, 'none');
    assert.equal(source.outerHTML, before);
  }
});
