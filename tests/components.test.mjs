import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, cloneForAdapter, readFixture } from './helpers/dom.mjs';
import { excludedContent } from '../src/content-filter.js';
import { preserveChecklist } from '../src/export/adapters/checklist.js';
import { preserveComponents } from '../src/export/adapters/components.js';

async function sample(name) {
  const { document } = createDOM(`<main>${await readFixture(`structured-${name}`)}</main>`);
  const source = document.querySelector('main');
  return { source, ...cloneForAdapter(source, { omitted: excludedContent(source), stripStyles: true, stripClasses: true }) };
}
const readStyle = source => ({ getPropertyValue: name => {
  const value = source.style.getPropertyValue(name) || '';
  // Resolve the host variables used by these samples, as a browser would.
  return value.replace(/calc\(var\(--spacing, 0.25rem\) \* (\d+)\)/g, (_, n) => `${Number(n) * 4}px`);
} });

test('schedule columns retain authored widths without turning text boxes into shapes', async () => {
  const { document } = createDOM(`<main>${await readFixture('expo-schedule')}</main>`);
  const source = document.querySelector('main');
  const before = source.outerHTML;
  const { clone, map } = cloneForAdapter(source, { stripStyles: true, stripClasses: true });
  preserveComponents(clone, map, readStyle);
  const columns = [...clone.querySelectorAll('[data-d-has-width]')];
  assert.equal(columns.length, 22);
  assert.ok(columns.every(column => column.style.width === '100px'));
  assert.equal(clone.querySelector('[data-export-shape]'), null);
  assert.equal(source.outerHTML, before);
});

test('width-only boxes preserve percentages but do not copy measured host widths', () => {
  const { document } = createDOM('<main><div data-d-component="box" data-d-has-width style="width:25%">Label</div><div data-d-component="box">Fluid</div></main>');
  const { clone, map } = cloneForAdapter(document.querySelector('main'), { stripStyles: true });
  preserveComponents(clone, map, source => ({ getPropertyValue: name => name === 'width' ? '240px' : readStyle(source).getPropertyValue(name) }));
  assert.equal(clone.firstElementChild.style.width, '25%');
  assert.ok(!clone.lastElementChild.style.width);
});

test('structured layouts preserve computed alignment including overrides of semantic attributes', () => {
  const {document} = createDOM(`<main>
    <div data-d-component="row" data-d-justify="center" style="justify-content:space-evenly;align-items:baseline;align-self:flex-end"><p data-d-component="text" data-d-text-align="center" style="text-align:right">A different label</p></div>
    <div data-d-component="grid-item" style="justify-self:center;align-self:start"><h2 data-d-component="title" style="text-align:center">Heading</h2><span data-d-component="caption" style="text-align:end">Caption</span></div>
  </main>`);
  const source = document.querySelector('main');
  const before = source.outerHTML;
  const {clone, map} = cloneForAdapter(source, {stripStyles: true, stripClasses: true});
  preserveComponents(clone, map, readStyle);
  const row = clone.querySelector('[data-export-component=row]');
  assert.equal(row.style.justifyContent, 'space-evenly');
  assert.equal(row.style.alignItems, 'baseline');
  assert.equal(row.style.alignSelf, 'flex-end');
  assert.equal(row.querySelector('p').style.textAlign, 'right');
  const item = clone.querySelector('[data-export-component=grid-item]');
  assert.equal(item.style.justifySelf, 'center');
  assert.equal(item.style.alignSelf, 'start');
  assert.equal(item.querySelector('h2').style.textAlign, 'center');
  assert.equal(item.querySelector('span').style.textAlign, 'end');
  assert.equal(source.outerHTML, before);
});

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
  assert.deepEqual([...clone.querySelectorAll('[data-component-checkbox]')].map(el => el.getAttribute('data-checklist-box')), ['unchecked', 'checked', 'mixed', 'unchecked', 'unchecked']);
  assert.equal(clone.querySelectorAll('[data-checklist-item]').length, 0);
  assert.equal(clone.querySelectorAll('hr[data-export-component="divider"]').length, 4);
  assert.equal(clone.querySelector('[data-d-has-width]').style.width, '0%');
  assert.equal(clone.querySelector('[data-d-has-width]').style.height, '4px');
  assert.ok(clone.querySelector('[data-export-secondary]'));
});

test('progress fill preserves partial and full widths', async () => {
  for (const width of ['0%', '33.3333%', '100%']) {
    const { source, clone, map } = await sample('progress');
    source.querySelector('[data-d-has-width]').style.width = width;
    preserveComponents(clone, map, readStyle);
    assert.equal(clone.querySelector('[data-d-has-width]').style.width, width);
    assert.equal(clone.querySelector('[data-d-has-width]').style.backgroundColor, 'rgb(57, 132, 94)');
  }
});

test('colored progress variables resolve to accent paint without changing proportional width', () => {
  const { document } = createDOM('<main><div data-d-component="box" data-d-has-height style="height:4px;background-color:var(--track)"><div data-d-component="box" data-d-has-height data-d-has-width style="height:4px;width:50%;background-color:var(--accent)"></div></div></main>');
  const { clone, map } = cloneForAdapter(document.querySelector('main'), { stripStyles: true });
  preserveComponents(clone, map, source => ({ getPropertyValue: name => name === 'background-color' ? (source.hasAttribute('data-d-has-width') ? 'rgb(20, 100, 220)' : 'rgb(240, 240, 240)') : source.style.getPropertyValue(name) || '' }));
  const fill = clone.querySelector('[data-d-has-width]');
  assert.equal(fill.style.backgroundColor, 'rgb(20, 100, 220)');
  assert.equal(fill.style.width, '50%');
});

test('chart accessibility data and hover overlays are excluded while visible lists remain', () => {
  const {document} = createDOM('<main><div data-d-component="chart"><svg/><ul class="sr-only"><li>Jan: 1200</li></ul><div class="recharts-tooltip-wrapper">Hover</div><div role="tooltip">Hover</div></div><ul id="visible"><li>Ordinary answer list</li></ul></main>');
  const omitted = excludedContent(document.querySelector('main'));
  assert.ok(omitted.has(document.querySelector('.sr-only')));
  assert.ok(omitted.has(document.querySelector('[role=tooltip]')));
  assert.ok(omitted.has(document.querySelector('.recharts-tooltip-wrapper')));
  assert.ok(!omitted.has(document.querySelector('#visible')));
});

test('checkbox controls in generic rows retain live completion state without li or component metadata', () => {
  const {document} = createDOM('<main><div><button role="checkbox" aria-checked="true"></button><span>Done task</span></div><label><input type="checkbox"><span>Remaining task</span></label><div><button role="checkbox" aria-checked="mixed"></button><span>Partial</span></div></main>');
  const source = document.querySelector('main');
  const { clone, map } = cloneForAdapter(source);
  source.querySelector('input').checked = true; // property can differ from the attribute
  preserveChecklist(clone, map);
  assert.deepEqual([...clone.querySelectorAll('[data-checklist-box]')].map(el=>el.getAttribute('data-checklist-box')), ['checked','checked','mixed']);
  assert.equal(clone.querySelectorAll('[data-export-checklist-row]').length,3);
  assert.equal(clone.querySelectorAll('input,button').length,0);
});

test('segmented time bar retains accent colors, proportional flex weights and legend widths', async () => {
  const {source,clone,map} = await sample('segmented-bar');
  preserveComponents(clone,map, node => ({getPropertyValue: name => {
    if (name === 'flex-grow') return node.style.flex?.split(' ')[0] || '';
    if (name === 'flex-shrink') return node.style.flex?.split(' ')[1] || node.style.getPropertyValue(name) || '';
    if (name === 'flex-basis') return node.style.flex?.split(' ')[2] || '';
    return node.style.getPropertyValue(name) || '';
  }}));
  const track = clone.querySelector('[data-d-has-height][data-d-direction=row]');
  assert.equal(track.style.height, '14px');
  assert.deepEqual([...track.children].map(el => el.style.flexGrow), ['5','5','12','18','5']);
  assert.deepEqual([...track.children].map(el => el.style.backgroundColor),
    [...source.querySelector('[data-d-has-height][data-d-direction=row]').children].map(el => el.style.backgroundColor));
  assert.ok([...track.children].every(el => el.style.backgroundColor));
  assert.equal(clone.querySelector('td').style.width, '8%');
  assert.equal(clone.querySelectorAll('[data-export-component=table-cell][data-d-align=end]').length, 5);
});

test('inline entity names become inert while actions remain owned by cleanup', () => {
  const {document}=createDOM('<main><p><span data-d-component="pressable" data-d-inline role="button" tabindex="0"><span>拉鲁拉丝</span></span> → 沙奈朵</p><table><tr><td><span data-d-component="pressable" data-d-inline role="button">宝贝龙</span></td></tr></table><button data-d-component="pressable">Reset</button><div role="button" data-d-component="popover-trigger">Citation</div></main>');
  const source = document.querySelector('main');
  const { clone, map } = cloneForAdapter(source, { stripStyles: true });
  preserveComponents(clone,map,readStyle);
  assert.equal(clone.querySelector('p').textContent,'拉鲁拉丝 → 沙奈朵');
  assert.equal(clone.querySelector('td').textContent,'宝贝龙');
  assert.equal(clone.querySelectorAll('[data-export-entity]').length,2);
  assert.equal(clone.querySelectorAll('[data-export-entity][tabindex],[data-export-entity][role=button]').length, 0);
  assert.equal(clone.querySelector('button').textContent, 'Reset');
});

test('structured grid retains fluid columns, item placement and spacing', () => {
  const {document}=createDOM('<main><div data-d-component="grid" style="grid-template-columns:repeat(3, minmax(0px, 1fr));gap:8px"><div data-d-component="grid-item" style="--grid-item-column:span 2;--grid-item-row:auto"><p>巨沼怪</p></div><div data-d-component="grid-item"><p>沙奈朵</p></div></div></main>');
  const source = document.querySelector('main');
  const { clone, map } = cloneForAdapter(source, { stripStyles: true });
  preserveComponents(clone,map,readStyle);
  const grid=clone.querySelector('[data-export-component=grid]');
  assert.equal(grid.style.gridTemplateColumns,'repeat(3, minmax(0px, 1fr))');
  assert.equal(grid.style.gap,'calc(8px * var(--spacing-scale, 1))');
  assert.equal(grid.querySelector('[data-export-component=grid-item]').style.gridColumn,'span 2');
  assert.equal(grid.querySelectorAll('[data-export-component=grid-item]').length,2);
});

test('grid rows recompute for export instead of copying measured host heights', () => {
  const {document}=createDOM('<main><div data-d-component="grid" style="grid-template-columns:repeat(3,minmax(0px,1fr))"><div data-d-component="grid-item"><p>Caption</p></div></div></main>');
  const source = document.querySelector('main');
  const { clone, map } = cloneForAdapter(source, { stripStyles: true });
  preserveComponents(clone,map,node=>({getPropertyValue:name=>name==='grid-template-rows'?'326px 326px':readStyle(node).getPropertyValue(name)}));
  assert.ok(!clone.querySelector('[data-export-component=grid]').style.gridTemplateRows);
  assert.equal(clone.querySelector('[data-export-component=grid]').style.gridTemplateColumns,'repeat(3,minmax(0px,1fr))');
});

test('clipped media surfaces retain container sizing and resolved clipping without capturing standalone diagrams', async () => {
  const {document} = createDOM(`<main>${await readFixture('mixed-media-grid')}<div data-d-component="box"><img data-d-component="svg" src="data:image/svg+xml,%3Csvg/%3E" style="width:100%"></div></main>`);
  const source = document.querySelector('main');
  const before = source.outerHTML;
  const {clone, map} = cloneForAdapter(source, {stripStyles: true, stripClasses: true});
  preserveComponents(clone, map, node => ({getPropertyValue: property => property === 'border-radius' && node.hasAttribute('data-d-clip') ? '23px' : readStyle(node).getPropertyValue(property)}));
  const surfaces = [...clone.querySelectorAll('[data-export-media]')];
  assert.equal(surfaces.length, 2);
  assert.ok(surfaces.every(node => node.style.width === '100%' && node.style.aspectRatio === 'auto 320 / 180'));
  for (const frame of clone.querySelectorAll('[data-d-clip=true]')) {
    assert.equal(frame.style.borderRadius, '23px');
    assert.equal(frame.style.overflow, 'hidden');
  }
  assert.equal(clone.lastElementChild.querySelector('[data-export-media]'), null);
  assert.equal(source.outerHTML, before);
});

test('media ownership follows neutral wrappers and authored proportions but stops at text-bearing layouts', () => {
  const {document} = createDOM(`<main>
    <div data-d-component="box" data-d-clip="true" style="border-radius:7px"><span><svg data-d-component="svg" viewBox="0 0 400 300" style="width:75%;aspect-ratio:4 / 3"/></span></div>
    <div data-d-component="box" data-d-clip="true"><h3>Standalone diagram within a clipped document</h3><div><img data-d-component="svg" style="width:100%"></div></div>
    <div data-d-component="box" data-d-clip="false"><img data-d-component="svg" style="width:100%"></div>
  </main>`);
  const {clone,map} = cloneForAdapter(document.querySelector('main'), {stripStyles:true});
  preserveComponents(clone,map,readStyle);
  assert.equal(clone.querySelectorAll('[data-export-media]').length,1);
  const media = clone.querySelector('[data-export-media]');
  assert.equal(media.style.width,'75%');
  assert.equal(media.style.aspectRatio,'4 / 3');
  assert.equal(clone.firstElementChild.style.borderRadius,'7px');
  assert.equal(clone.querySelector('[data-d-clip=false]').style.overflow,'');
});

test('fixed icon containers preserve layout and neutral paint while empty tracks keep theme fallback', async () => {
  const {document}=createDOM(`<main>${await readFixture('step-icons')}<div data-d-component="box" data-d-has-height style="height:4px;background-color:var(--track)"></div></main>`);
  const source=document.querySelector('main');const before=source.outerHTML;
  const {clone,map}=cloneForAdapter(source,{stripStyles:true});
  preserveComponents(clone,map,n=>({getPropertyValue:p=>p==='background-color'?'rgba(255, 255, 255, 0)':p==='justify-content'||p==='align-items'?'center':readStyle(n).getPropertyValue(p)}));
  const boxes=[...clone.querySelectorAll('[data-export-shape]')];
  assert.equal(boxes.length,6);
  for(const b of boxes.slice(0,5)){
    assert.equal(b.hasAttribute('data-export-shape-paint'),false);
    assert.equal(b.style.backgroundColor,'rgba(255, 255, 255, 0)');
    assert.equal(b.style.justifyContent,'center');assert.equal(b.style.alignItems,'center');
    assert.equal(b.style.width,'40px');assert.equal(b.style.height,'40px');
  }
  assert.equal(boxes[5].hasAttribute('data-export-shape-paint'),true);
  assert.equal(source.outerHTML,before);
});
