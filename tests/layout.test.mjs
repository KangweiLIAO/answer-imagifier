import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validLayout, baseFontSize, recommendedWidth } from '../src/layout.js';
const options = {widthMode:'custom',width:760,fontSize:'custom',customFontSize:16};
test('layout accepts boundary values and rejects invalid active inputs', () => {
  for (const width of [600,1600]) for (const customFontSize of [12,24]) assert.ok(validLayout({...options,width,customFontSize}));
  for (const width of [599,1601,NaN,760.5]) assert.equal(validLayout({...options,width}), false);
  for (const customFontSize of [11,25,NaN,16.5]) assert.equal(validLayout({...options,customFontSize}), false);
  assert.ok(validLayout({...options,widthMode:'auto',width:NaN,fontSize:'standard',customFontSize:NaN}));
});
test('automatic width responds to typography and wide tables within its limit', () => {
  const card = {querySelectorAll: selector => selector.endsWith('table') ? [{rows:[{cells:Array.from({length:8},()=>({colSpan:1}))}]}] : []};
  assert.equal(recommendedWidth(card,{...options,customFontSize:16}),1040);
  assert.equal(recommendedWidth(card,{...options,customFontSize:24}),1520);
  assert.equal(baseFontSize({fontSize:'small'}),14);
  assert.equal(baseFontSize({fontSize:'large'}),18);
  const empty = {querySelectorAll:()=>[]};
  assert.equal(recommendedWidth(empty,{...options,customFontSize:16}),760);
});
