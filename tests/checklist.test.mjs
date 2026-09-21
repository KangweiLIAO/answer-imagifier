import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { preserveChecklist } from '../src/checklist.js';

function convert(html, change = () => {}) {
  const { document } = parseHTML(`<html><body><div>${html}</div></body></html>`);
  const source = document.querySelector('body > div');
  change(source);
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  preserveChecklist(clone, new Map(copies.map((copy, i) => [copy, originals[i]])));
  // Same control cleanup as the export renderer; static SVGs must survive it.
  clone.querySelectorAll('button,input,textarea,select,[role="button"],[hidden],[aria-hidden="true"]').forEach(e => e.remove());
  return clone;
}
test('checklists preserve live checked state rather than stale attributes', () => {
  const clone = convert('<ul><li><input type="checkbox" checked>Unchecked now</li><li><input type="checkbox">Checked now</li></ul>', source => {
    const inputs = source.querySelectorAll('input');
    inputs[0].checked = false;
    inputs[1].checked = true;
  });
  assert.deepEqual([...clone.querySelectorAll('svg')].map(e => e.getAttribute('data-checklist-box')), ['unchecked', 'checked']);
  assert.equal(clone.querySelectorAll('input').length, 0);
  assert.equal(clone.querySelectorAll('svg path').length, 1);
});
test('nested tasks and ARIA checkboxes keep states without changing ordinary list items', () => {
  const clone = convert('<ul><li id="ordinary">Normal<ul><li><p><button role="checkbox" aria-checked="true">Old icon</button>Long task</p><ul><li><input type="checkbox">Nested task</li></ul></li></ul></li><li><span role="checkbox" aria-checked="mixed"></span>Partial</li></ul>');
  assert.equal(clone.querySelector('#ordinary').hasAttribute('data-checklist-item'), false);
  assert.equal(clone.querySelectorAll('[data-checklist-item]').length, 3);
  assert.deepEqual([...clone.querySelectorAll('svg')].map(e => e.getAttribute('data-checklist-box')), ['checked', 'unchecked', 'mixed']);
  assert.match(clone.textContent, /Long taskNested task/);
  assert.doesNotMatch(clone.textContent, /Old icon/);
});
test('non-list form controls are still removed', () => {
  const clone = convert('<input type="checkbox" checked><ul><li>Normal bullet</li></ul>');
  assert.equal(clone.querySelectorAll('svg,[data-checklist-item],input').length, 0);
});
