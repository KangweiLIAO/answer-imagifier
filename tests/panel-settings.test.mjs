import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { DEFAULT_SETTINGS } from '../src/settings.js';

test('panel restores controls before its first preview and saves changes without exporting', async () => {
  const {document,window} = parseHTML('<html><body><div id="answer">Answer</div></body></html>');
  document.title = 'Current conversation';
  const saved = {...DEFAULT_SETTINGS,theme:'dark',format:'jpg',width:960,prompt:true,compact:true,fontSize:'large'};
  let restore, render, snapshot;
  const writes = [];
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    if (tag === 'dialog') { node.showModal = () => {}; node.close = () => {}; }
    return node;
  };
  const source = (await readFile('src/panel.js','utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  const context = { document, element, DEFAULT_SETTINGS, loadSettings:()=>new Promise(resolve=>{restore=resolve;}),
    saveSettings:value=>writes.push({...value}), getAnswers:()=>[document.querySelector('#answer')],
    PLUGIN_NAME:'Test', t:key=>key, locale:'en', panelCSS:'',cardCSS:'', CORNER_RADIUS:12,
    setTimeout:callback=>{render=callback;return 1;},clearTimeout:()=>{},isStreaming:()=>false,
    createCard:async (_,options)=>{snapshot=options;throw Error('Rendering intentionally stubbed');},
  };
  runInNewContext(source,context);
  context.openPanel(document.querySelector('#answer'));
  const root = document.querySelector('#answer-imagifier-root').shadowRoot;
  assert.equal(render,undefined);
  assert.equal(root.querySelector('#prompt').disabled,true);
  restore(saved);
  await Promise.resolve();
  assert.equal(root.querySelector('[data-value="dark"]').getAttribute('aria-pressed'),'true');
  assert.equal(root.querySelector('#prompt').checked,true);
  assert.equal(root.querySelector('#filename').value,'Current conversation');
  await render();
  assert.equal(snapshot.format,'jpg');
  assert.equal(snapshot.width,960);
  root.querySelector('[data-value="light"]').click();
  assert.equal(writes.at(-1).theme,'light');
  assert.equal(writes.at(-1).format,'jpg');
  root.querySelector('#compact').checked = false;
  root.querySelector('#compact').dispatchEvent(new window.Event('change'));
  assert.equal(writes.at(-1).compact,false);
  assert.equal('filename' in writes.at(-1),false);
});
