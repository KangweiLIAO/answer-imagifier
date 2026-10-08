import {test} from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, stubProperties } from './helpers/dom.mjs';
import {prepareTableLayouts,applyTableLayouts,hasCrampedTableColumns} from '../src/table-layout.js';

function fixture(html,t) {
  const {document}=createDOM(`<article><section class="answer-content">${html}</section></article>`);
  stubProperties(t, globalThis, { getComputedStyle: () => ({ fontSize: '14px', fontWeight: '400', fontFamily: 'Arial' }) });
  for(const table of document.querySelectorAll('table')) {
    Object.defineProperty(table,'rows',{value:[...table.querySelectorAll('tr')]});
    for(const row of table.rows) Object.defineProperty(row,'cells',{value:[...row.querySelectorAll('th,td')]});
  }
  return document.querySelector('article');
}

test('short table columns reserve measured width while long descriptions take remaining space',t=>{
  const card=fixture('<table><tr><th>排名</th><th>性格</th><th>理由</th></tr><tr><td>1</td><td>固执 / 爽朗</td><td>这是一段需要合理换行而不挤压短列的很长很长的说明文字</td></tr></table>',t);
  const plans=prepareTableLayouts(card,text=>text.length*14);
  assert.equal(plans.length,1);
  assert.deepEqual(plans[0].columns.map(c=>c.compact),[true,true,false]);
  plans[0].table.getBoundingClientRect=()=>({width:800});
  applyTableLayouts(plans);
  const widths=plans[0].columns.map(c=>parseFloat(c.col.style.width));
  assert.ok(widths[2]>widths[1]);
  assert.ok(Math.abs(widths.reduce((a,b)=>a+b,0)-100)<.001);
  for(const column of plans[0].columns)column.cells[0].getBoundingClientRect=()=>({width:column.desired});
  assert.equal(hasCrampedTableColumns(plans),false);
  plans[0].columns[1].cells[0].getBoundingClientRect=()=>({width:40});
  assert.equal(hasCrampedTableColumns(plans),true);
});

test('authored column widths and spanning cells retain their existing layout',t=>{
  const card=fixture('<table><tr><td style="width:8%">Icon</td><td>Label</td></tr></table><table><tr><td>Title</td><td>Other</td></tr><tr><td colspan="2">Spanning</td></tr></table>',t);
  // DOM implementations expose spans differently; set the browser properties.
  card.querySelector('[colspan]').colSpan=2;
  assert.equal(prepareTableLayouts(card,text=>text.length*8).length,0);
});
