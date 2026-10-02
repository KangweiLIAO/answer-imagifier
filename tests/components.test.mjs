import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { excludedContent } from '../src/content-filter.js';
import { preserveChecklist } from '../src/checklist.js';
import { preserveComponents } from '../src/components.js';

async function sample(name) {
  const html = await readFile(new URL(`./fixtures/structured-${name}.html`, import.meta.url), 'utf8');
  const { document } = parseHTML(`<html><body><main>${html}</main></body></html>`);
  const source = document.querySelector('main');
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  const map = new Map(copies.map((copy, index) => [copy, originals[index]]));
  const omitted = excludedContent(source);
  for (const copy of copies) {
    if (omitted.has(map.get(copy))) copy.remove();
    copy.removeAttribute('class');
    copy.removeAttribute('style');
  }
  return { source, clone, map };
}
const readStyle = source => ({ getPropertyValue: name => {
  const value = source.style.getPropertyValue(name) || '';
  // Resolve the host variables used by these samples, as a browser would.
  return value.replace(/calc\(var\(--spacing, 0.25rem\) \* (\d+)\)/g, (_, n) => `${Number(n) * 4}px`);
} });

test('structured SVG survives filtering while ordinary and generated images remain excluded', async () => {
  const { source, clone, map } = await sample('diagram');
  preserveComponents(clone, map, readStyle);
  assert.equal(clone.querySelectorAll('img[data-export-component="svg"]').length, 1);
  assert.match(decodeURIComponent(clone.querySelector('img').getAttribute('src')), /Load Balancer/);
  assert.equal(clone.querySelector('[data-d-has-border]').style.getPropertyValue('gap'), 'calc(8px * var(--spacing-scale, 1))');
  assert.equal(clone.querySelectorAll('ol li').length, 5);
  source.innerHTML = '<img src="ordinary.png"><div data-image-generation><img data-d-component="svg" src="data:image/svg+xml,%3Csvg/%3E"></div>';
  assert.equal([...excludedContent(source)].filter(el => el.localName === 'img').length, 2);
});

test('component rows preserve checkbox states, zero progress and dividers', async () => {
  const { source, clone, map } = await sample('progress');
  const controls = source.querySelectorAll('[role="checkbox"]');
  controls[1].setAttribute('aria-checked', 'true');
  controls[2].setAttribute('aria-checked', 'mixed');
  preserveChecklist(clone, map);
  preserveComponents(clone, map, readStyle);
  clone.querySelectorAll('button,input').forEach(el => el.remove());
  assert.deepEqual([...clone.querySelectorAll('[data-component-checkbox]')].map(el => el.getAttribute('data-checklist-box')), ['unchecked', 'checked', 'mixed', 'unchecked', 'unchecked']);
  assert.equal(clone.querySelectorAll('[data-checklist-item]').length, 0);
  assert.equal(clone.querySelectorAll('hr[data-export-component="divider"]').length, 4);
  assert.equal(clone.querySelector('[data-d-has-width]').style.width, '0%');
  assert.equal(clone.querySelector('[data-d-has-width]').style.height, '4px');
  assert.ok(clone.querySelector('[data-export-secondary]'));
});

test('progress fill preserves partial and full widths', async () => {
  for (const width of ['40%', '100%']) {
    const { source, clone, map } = await sample('progress');
    source.querySelector('[data-d-has-width]').style.width = width;
    preserveComponents(clone, map, readStyle);
    assert.equal(clone.querySelector('[data-d-has-width]').style.width, width);
  }
});

test('chart accessibility data and hover overlays are excluded while visible lists remain', () => {
  const {document} = parseHTML('<main><div data-d-component="chart"><svg/><ul class="sr-only"><li>Jan: 1200</li></ul><div class="recharts-tooltip-wrapper">Hover</div><div role="tooltip">Hover</div></div><ul id="visible"><li>Ordinary answer list</li></ul></main>');
  const omitted = excludedContent(document.querySelector('main'));
  assert.ok(omitted.has(document.querySelector('.sr-only')));
  assert.ok(omitted.has(document.querySelector('[role=tooltip]')));
  assert.ok(omitted.has(document.querySelector('.recharts-tooltip-wrapper')));
  assert.ok(!omitted.has(document.querySelector('#visible')));
});

test('checkbox controls in generic rows retain live completion state without li or component metadata', () => {
  const {document} = parseHTML('<main><div><button role="checkbox" aria-checked="true"></button><span>Done task</span></div><label><input type="checkbox"><span>Remaining task</span></label><div><button role="checkbox" aria-checked="mixed"></button><span>Partial</span></div></main>');
  const source = document.querySelector('main'), clone = source.cloneNode(true);
  const originals = [source,...source.querySelectorAll('*')], copies = [clone,...clone.querySelectorAll('*')];
  originals[1].querySelector('button').setAttribute('aria-checked','true');
  source.querySelector('input').checked = true; // property can differ from the attribute
  preserveChecklist(clone,new Map(copies.map((copy,i)=>[copy,originals[i]])));
  assert.deepEqual([...clone.querySelectorAll('[data-checklist-box]')].map(el=>el.getAttribute('data-checklist-box')), ['checked','checked','mixed']);
  assert.equal(clone.querySelectorAll('[data-export-checklist-row]').length,3);
  assert.equal(clone.querySelectorAll('input,button').length,0);
});
