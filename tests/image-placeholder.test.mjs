import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {excludedContent} from '../src/content-filter.js';
import {preserveComponents} from '../src/components.js';
import {preserveImagePlaceholders} from '../src/image-placeholder.js';

function convert(html, enabled = true) {
  const {document}=parseHTML(`<main>${html}</main>`);
  const source=document.querySelector('main'),clone=source.cloneNode(true);
  const originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const map=new Map(copies.map((copy,i)=>[copy,originals[i]])),omitted=excludedContent(source);
  for (const copy of copies) {
    if(omitted.has(map.get(copy)))copy.remove();
    copy.removeAttribute('style');
  }
  preserveComponents(clone,map,()=>({getPropertyValue:name=>name==='height'?'900px':''}));
  preserveImagePlaceholders(clone,map,omitted,'Image',enabled);
  return clone;
}

test('thumbnail placeholders retain authored proportions and width without host height or loading controls',()=>{
  const clone=convert('<div data-d-component="row"><div data-d-component="box" data-d-has-height style="max-width:100px;width:100%;aspect-ratio:1 / 1">\n<div data-d-component="image"><img src="https://example.com/a.png"><div data-d-component="loading-block"></div><button>Download</button></div>\n</div><div data-d-component="box"><p>拉鲁拉丝</p></div></div>');
  const placeholder=clone.querySelector('[data-export-image-placeholder]');
  assert.equal(placeholder.style.maxWidth,'100px');
  assert.equal(placeholder.style.aspectRatio,'1 / 1');
  assert.ok(!placeholder.style.height);
  assert.equal(placeholder.textContent,'Image');
  assert.equal(clone.querySelectorAll('img,button,[data-d-component=loading-block],[data-export-shape]').length,0);
  assert.ok(clone.textContent.includes('拉鲁拉丝'));
});

test('grid placeholders stay fluid and do not replace supported SVG images',()=>{
  const clone=convert('<div data-d-component="grid-item"><div data-d-component="box" data-d-has-height style="width:100%;max-width:100%;aspect-ratio:4 / 3"><div data-d-component="image"><img src="https://example.com/a.png"></div></div><p>巨沼怪</p></div><div data-d-component="image"><img data-d-component="svg" src="data:image/svg+xml,test"></div><div id="progress" data-d-component="box" data-d-has-height></div>');
  const placeholder=clone.querySelector('[data-export-image-placeholder]');
  assert.equal(placeholder.style.width,'100%');
  assert.equal(placeholder.style.aspectRatio,'4 / 3');
  assert.equal(clone.querySelectorAll('[data-export-image-placeholder]').length,1);
  assert.ok(clone.querySelector('img[data-d-component=svg]'));
  assert.ok(clone.querySelector('#progress'));
});


test('disabling placeholders removes image-only frames and retains captions',()=>{
  const clone=convert('<div data-d-component="grid-item"><div data-d-component="box" data-d-has-height><div data-d-component="image"><img src="https://example.com/a.png"><button>Download</button></div></div><p>巨沼怪</p></div>',false);
  assert.equal(clone.querySelectorAll('[data-export-image-placeholder],[data-export-shape],img,button').length,0);
  assert.equal(clone.querySelector('[data-d-component=grid-item]').textContent,'巨沼怪');
});
