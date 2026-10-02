import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {preserveVisualAssets} from '../src/visual-assets.js';
import {preserveComponents} from '../src/components.js';
import {applyImageWidths} from '../src/image-width.js';

const markup = '<p>Visit <a href="https://example.com">hyperlinks <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 18 18 6"/></svg></a> for details.</p><div data-d-component="box" data-d-has-border style="border:1px solid rgb(220,160,40)"><div style="display:flex;flex-direction:row;gap:8px"><svg viewBox="0 0 24 24" width="18" height="18"><path/></svg><strong>Warning</strong></div><p>Validate user input.</p></div><svg data-d-component="svg" viewBox="0 0 24 24" width="24" height="24"><path/></svg><svg viewBox="0 0 320 234"><text>Client</text></svg>';

test('link and callout icons remain inline while explicit and text-bearing charts scale', () => {
  const {document} = parseHTML(`<html><body><div class="answer-content">${markup}</div></body></html>`);
  const source = document.querySelector('.answer-content');
  source.querySelectorAll('svg').forEach(svg=>{svg.getBoundingClientRect=()=>({width:Number(svg.getAttribute('width'))||320,height:Number(svg.getAttribute('height'))||234});});
  const clone = source.cloneNode(true);
  const originals=[source,...source.querySelectorAll('*')];
  const copies=[clone,...clone.querySelectorAll('*')];
  const map=new Map(copies.map((copy,index)=>[copy,originals[index]]));
  copies.slice(1).forEach(copy=>{copy.removeAttribute('class');copy.removeAttribute('style');});
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
  const previous=globalThis.getComputedStyle;
  globalThis.getComputedStyle=()=>({paddingLeft:'0px',paddingRight:'0px'});
  try {
    document.body.append(clone);
    applyImageWidths(document.body);
    assert.equal(clone.querySelectorAll('.export-image-frame').length,2);
    assert.equal(clone.querySelector('a svg').parentElement.localName,'a');
    assert.equal(clone.querySelector('[data-export-icon-row] svg').style.width,'1.125em');
  } finally {globalThis.getComputedStyle=previous;}
});
