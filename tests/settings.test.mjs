import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings, loadSettings, saveSettings } from '../src/settings.js';

test('missing and invalid settings fall back per field and exclude content', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({theme:'dark',width:999,scale:'3',prompt:'false',filename:'private',answer:'private'}), {...DEFAULT_SETTINGS,theme:'dark'});
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
  const last = saveSettings({...DEFAULT_SETTINGS,width:960,theme:'dark',format:'jpg',prompt:true,compact:true,fontSize:'large',scale:3});
  const restored = await loadSettings();
  assert.equal(await first, true);
  assert.equal(await last, true);
  assert.deepEqual(order,[600,960]);
  assert.deepEqual(restored,{...DEFAULT_SETTINGS,width:960,theme:'dark',format:'jpg',prompt:true,compact:true,fontSize:'large',scale:3});
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
