import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings, loadSettings, saveSettings } from '../src/settings.js';

test('missing and invalid settings fall back per field and exclude content', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({theme:'dark',width:599,scale:'3',prompt:'false',filename:'private',answer:'private',compact:false}), {...DEFAULT_SETTINGS,theme:'dark'});
});
test('settings persist across reads and rapid writes finish in order', async t => {
  const previous = globalThis.chrome;
  t.after(() => { globalThis.chrome = previous; });
  let data = {};
  const order = [];
  globalThis.chrome = {storage:{local:{
    get: async () => data,
    set: async value => { await new Promise(resolve => setTimeout(resolve, 5)); order.push(value.exportSettings.width); data = value; },
  }}};
  assert.deepEqual(await loadSettings(), DEFAULT_SETTINGS);
  const first = saveSettings({...DEFAULT_SETTINGS,width:600});
  const last = saveSettings({...DEFAULT_SETTINGS,width:960,theme:'dark',format:'jpg',prompt:true,fontSize:'large',scale:3});
  const restored = await loadSettings();
  assert.equal(await first, true);
  assert.equal(await last, true);
  assert.deepEqual(order,[600,960]);
  assert.deepEqual(restored,{...DEFAULT_SETTINGS,width:960,theme:'dark',format:'jpg',prompt:true,fontSize:'large',scale:3});
});
test('storage failures fall back and do not poison later writes', async t => {
  const previous = globalThis.chrome;
  t.after(() => { globalThis.chrome = previous; });
  globalThis.chrome = {storage:{local:{get:async()=>{throw Error('read');},set:async()=>{throw Error('write');}}}};
  assert.deepEqual(await loadSettings(),DEFAULT_SETTINGS);
  assert.equal(await saveSettings(DEFAULT_SETTINGS),false);
  globalThis.chrome.storage.local.set = async () => {};
  assert.equal(await saveSettings(DEFAULT_SETTINGS),true);
});
test('unavailable extension storage keeps defaults and does not throw', async t => {
  const previous = globalThis.chrome;
  t.after(() => { globalThis.chrome = previous; });
  globalThis.chrome = undefined;
  assert.deepEqual(await loadSettings(),DEFAULT_SETTINGS);
  assert.equal(await saveSettings(DEFAULT_SETTINGS),false);
});

test('custom layout settings persist and legacy widths retain their selection', () => {
  assert.equal(normalizeSettings({width:960}).widthMode, 'custom');
  const custom = {...DEFAULT_SETTINGS,widthMode:'custom',width:1234,fontSize:'custom',customFontSize:22};
  assert.deepEqual(normalizeSettings(custom), custom);
  const invalid = normalizeSettings({...custom,width:1601,customFontSize:25});
  assert.equal(invalid.width, 760);
  assert.equal(invalid.customFontSize, 16);
});

test('extension credit defaults on and preserves an explicit opt-out', () => {
  assert.equal(normalizeSettings({}).showCredit, true);
  assert.equal(normalizeSettings({showCredit:false}).showCredit, false);
});

test('diagram size and spacing persist independently and reject unknown levels', () => {
  assert.deepEqual(normalizeSettings({...DEFAULT_SETTINGS, diagramSize:'small',spacing:'large'}), {...DEFAULT_SETTINGS,diagramSize:'small',spacing:'large'});
  assert.equal(normalizeSettings({diagramSize:'custom',spacing:0}).diagramSize, 'standard');
  assert.equal(normalizeSettings({spacing:0}).spacing, 'standard');
});

test('auto-render on entry defaults off and accepts only boolean preferences', () => {
  assert.equal(normalizeSettings({}).autoRender, false);
  assert.equal(normalizeSettings({autoRender:true}).autoRender, true);
  assert.equal(normalizeSettings({autoRender:'true'}).autoRender, false);
});
