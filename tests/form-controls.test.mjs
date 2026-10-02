import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFile} from 'node:fs/promises';
import {preserveFormControls} from '../src/form-controls.js';
import {preserveChecklist} from '../src/checklist.js';
import {preserveComponents} from '../src/components.js';
const style = () => ({getPropertyValue:()=>''});
function convert(source) {
  const clone = source.cloneNode(true);
  const originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const map = new Map(copies.map((copy,i)=>[copy,originals[i]]));
  copies.forEach(copy=>{copy.removeAttribute('style');copy.removeAttribute('class');});
  preserveFormControls(clone,map,style);preserveChecklist(clone,map);preserveComponents(clone,map,style);
  clone.querySelectorAll('button,input,textarea,select,[role=button],[aria-hidden=true]').forEach(el=>el.remove());
  return clone;
}
test('Radix questionnaire exports each choice once and preserves custom fields and marks', async()=>{
  const html = await readFile(new URL('./fixtures/questionnaire.html',import.meta.url),'utf8');
  const {document}=parseHTML(`<main>${html}</main>`);
  const source=document.querySelector('main');
  source.querySelector('[role=radio]').setAttribute('aria-checked','true');
  source.querySelector('[role=checkbox]').setAttribute('aria-checked','true');
  source.querySelector('input[type=text]').value='Learn system design';
  source.querySelector('textarea').value='First line\nSecond line';
  const clone=convert(source);
  assert.equal(clone.querySelectorAll('[data-export-form-control=radio]').length,10);
  assert.equal(clone.querySelectorAll('[data-export-form-control=checkbox]').length,5);
  assert.equal(clone.querySelector('[data-export-form-control=checkbox]').getAttribute('data-checklist-box'),'checked');
  assert.ok(clone.querySelector('[data-export-form-control=checkbox] circle'));
  assert.equal(clone.querySelectorAll('[data-checklist-state]').length,0); // answers are not completed todos
  assert.match(clone.querySelector('[data-export-form-control=select]').textContent,/Select frequency/);
  assert.match(clone.querySelector('[data-export-form-control=date]').textContent,/10\/01\/26/);
  assert.equal(clone.querySelector('[data-export-form-control=input]').textContent,'Learn system design');
  assert.equal(clone.querySelector('[data-export-form-control=textarea]').textContent,'First line\nSecond line');
  assert.deepEqual([...clone.querySelectorAll('[data-export-form-control=slider-tick]')].map(el=>el.textContent),['0','5','10']);
  assert.equal(clone.querySelector('[data-export-form-control=slider-thumb]').style.left,'50%');
  assert.equal(clone.querySelectorAll('[data-export-form-control=button]').length,0);
  assert.doesNotMatch(clone.textContent,/Reset|Submit responses/);
  assert.ok(clone.querySelector('[data-export-component=badge]'));
});
test('native controls read live values, selected labels and range positions',()=>{
  const {document}=parseHTML('<main><form><label><input type=radio checked>A</label><select><option value=a>A</option><option value=b>B</option></select><input type=date><input type=range min=0 max=10 value=5><input type=text placeholder="Your answer"><input type=password></form><pre><code><input type=text value="Code example"></code></pre></main>');
  const source=document.querySelector('main');
  Object.defineProperty(source.querySelector('select'),'value',{value:'b'});
  source.querySelector('input[type=radio]').checked=false;
  source.querySelector('input[type=date]').value='2026-10-01';
  source.querySelector('input[type=range]').value='8';
  source.querySelector('input[type=password]').value='private';
  const clone=convert(source);
  assert.equal(clone.querySelector('[data-export-form-control=radio]').getAttribute('data-checklist-box'),'unchecked');
  assert.match(clone.querySelector('[data-export-form-control=select]').textContent,/B/);
  assert.match(clone.querySelector('[data-export-form-control=date]').textContent,/2026-10-01/);
  assert.equal(clone.querySelector('[data-export-form-control=slider-thumb]').style.left,'80%');
  assert.equal(clone.querySelector('[data-export-form-control=input]').textContent,'Your answer');
  assert.ok(clone.querySelector('[data-export-empty]'));
  assert.ok(!clone.textContent.includes('private'));
});

test('vertical form lists never wrap into columns and action-only containers are removed',()=>{
  const {document}=parseHTML('<main><form><div role="radiogroup" data-d-component="radio-group"><label><button role="radio" aria-checked="false"></button>One</label><label><button role="radio" aria-checked="true"></button>Two</label></div><div id="actions" data-d-component="row"><div data-d-component="box"><button>Reset</button></div><button type="submit">Submit responses</button></div></form></main>');
  const source=document.querySelector('main'),clone=source.cloneNode(true);
  const originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
  const map=new Map(copies.map((copy,i)=>[copy,originals[i]]));
  preserveFormControls(clone,map,source=>({getPropertyValue:name=>name==='display'?'flex':name==='flex-direction'?(source.matches('[role=radiogroup]')?'column':'row'):''}));
  assert.equal(clone.querySelector('[role=radiogroup]').style.flexWrap,'nowrap');
  assert.equal(clone.querySelector('label').style.flexWrap,'wrap');
  assert.equal(clone.querySelector('#actions'),null);
  assert.equal(clone.querySelectorAll('[data-export-form-control=radio]').length,2);
});
