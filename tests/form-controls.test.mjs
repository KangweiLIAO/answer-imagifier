import {test} from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, cloneForAdapter, readFixture } from './helpers/dom.mjs';
import {preserveFormControls} from '../src/export/adapters/form-controls.js';
const style = () => ({getPropertyValue:()=>''});
function convert(source) {
  const { clone, map } = cloneForAdapter(source, { stripStyles: true, stripClasses: true });
  preserveFormControls(clone, map, style);
  return clone;
}
test('Radix questionnaire exports each choice once and preserves custom fields and marks', async()=>{
  const html = await readFixture('questionnaire');
  const {document}=createDOM(`<main>${html}</main>`);
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
  assert.ok(clone.querySelector('[data-d-component=badge]')); // wrapper belongs to the layout adapter
});
test('native controls read live values, selected labels and range positions',()=>{
  const {document}=createDOM('<main><form><label><input type=radio checked>A</label><select><option value=a>A</option><option value=b>B</option></select><input type=date><input type=range min=0 max=10 value=5><input type=text placeholder="Your answer"><input type=password></form><pre><code><input type=text value="Code example"></code></pre></main>');
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
  const {document}=createDOM('<main><form><div role="radiogroup" data-d-component="radio-group"><label><button role="radio" aria-checked="false"></button>One</label><label><button role="radio" aria-checked="true"></button>Two</label></div><div id="actions" data-d-component="row"><div data-d-component="box"><button>Reset</button></div><button type="submit">Submit responses</button></div></form></main>');
  const source = document.querySelector('main');
  const { clone, map } = cloneForAdapter(source);
  preserveFormControls(clone,map,source=>({getPropertyValue:name=>name==='display'?'flex':name==='flex-direction'?(source.matches('[role=radiogroup]')?'column':'row'):''}));
  assert.equal(clone.querySelector('[role=radiogroup]').style.flexWrap,'nowrap');
  assert.equal(clone.querySelector('label').style.flexWrap,'wrap');
  assert.equal(clone.querySelector('#actions'),null);
  assert.equal(clone.querySelectorAll('[data-export-form-control=radio]').length,2);
});

test('scorecard segmented ratings preserve all labels and the current selection', async () => {
  const html = await readFixture('scorecard');
  const {document} = createDOM(`<main>${html}</main>`);
  const source = document.querySelector('main');
  source.querySelectorAll('[role=radio]')[1].setAttribute('aria-checked', 'true');
  const clone = convert(source);
  assert.equal(clone.querySelectorAll('[data-export-form-control=segmented]').length, 5);
  assert.equal(clone.querySelectorAll('[data-export-form-control=segment]').length, 15);
  assert.equal(clone.querySelector('[data-export-selected=true]').textContent, '1 · Assisted');
  assert.equal(clone.querySelectorAll('[data-checklist-box]').length, 0);
  assert.equal(clone.querySelectorAll('button').length, 0);
  for (const group of clone.querySelectorAll('[data-export-form-control=segmented]')) {
    assert.deepEqual([...group.children].map(item => item.textContent), ['0 · Missing', '1 · Assisted', '2 · Independent']);
  }
});

test('segmented controls preserve block intent and arbitrary option counts without depending on label text', () => {
  for (const count of [1, 2, 3, 5]) {
    for (const flag of ['', 'data-block', 'data-d-block']) {
      const labels = Array.from({length: count}, (_, i) => `选项 ${i + 1} · A longer independent label`);
      const {document} = createDOM(`<main><div data-d-component="segmented-control"><div role="radiogroup" ${flag} data-variant="ghost">${labels.map((label, i) => `<button role="radio" aria-checked="${i === count - 1}">${label}</button>`).join('')}</div></div></main>`);
      const source = document.querySelector('main');
      const original = source.outerHTML;
      const clone = convert(source);
      const group = clone.querySelector('[data-export-form-control=segmented]');
      assert.equal(group.hasAttribute('data-export-block'), !!flag);
      assert.equal(group.getAttribute('data-export-width'), flag ? '100%' : null);
      assert.equal(group.getAttribute('data-export-variant'), 'ghost');
      assert.ok(group.hasAttribute('data-export-form-text'));
      assert.deepEqual([...group.children].map(item => item.textContent), labels);
      assert.ok([...group.children].every(item => item.hasAttribute('data-export-form-text')));
      assert.equal(group.querySelector('[data-export-selected=true]').textContent, labels.at(-1));
      assert.equal(source.outerHTML, original);
    }
  }
  const {document} = createDOM('<main><div data-d-component="segmented-control" data-block><div role="radiogroup"><button role="radio">Wrapper flag</button></div></div></main>');
  assert.ok(convert(document.querySelector('main')).querySelector('[data-export-block]'));
});

test('text fields expose fluid sizing while sliders and choice geometry stay fixed; zero form gap is retained', () => {
  const {document} = createDOM('<main><form><div style="display:flex;flex-direction:column;gap:0px"><input type="text" placeholder="Label"><select><option>Current</option></select><input type="date"><textarea>Long value</textarea><input type="range"><label><input type="radio">Choice</label></div></form></main>');
  const source = document.querySelector('main');
  const {clone, map} = cloneForAdapter(source, {stripStyles: true});
  preserveFormControls(clone, map, element => ({getPropertyValue: name => element.style.getPropertyValue(name) || ''}));
  for (const kind of ['input', 'select', 'date', 'textarea']) {
    const field = clone.querySelector(`[data-export-form-control=${kind}]`);
    assert.ok(field.hasAttribute('data-export-form-text'), kind);
    assert.equal(field.getAttribute('data-export-width'), '100%', kind);
  }
  for (const kind of ['slider', 'slider-track', 'slider-thumb', 'radio', 'arrow', 'calendar']) {
    assert.equal(clone.querySelector(`[data-export-form-control=${kind}]`).hasAttribute('data-export-form-text'), false, kind);
  }
  assert.equal(clone.querySelector('form>div').style.gap, 'calc(0px * var(--spacing-scale, 1))');
});
