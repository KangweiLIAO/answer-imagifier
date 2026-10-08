import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { validLayout, inRange, WIDTH_LIMITS, FONT_LIMITS } from '../src/layout.js';
import { DEFAULT_SETTINGS } from '../src/settings.js';
const infoIcon = await readFile('src/assets/info.svg', 'utf8');

for (const autoRender of [false, true]) test(`panel restores controls before its first preview (auto entry: ${autoRender}) and saves changes without exporting`, async () => {
  const {document,window} = parseHTML('<html><body><div id="answer">Answer</div></body></html>');
  document.title = 'Current conversation';
  const saved = {...DEFAULT_SETTINGS,theme:'dark',format:'jpg',width:960,prompt:true,fontSize:'large',autoRender};
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
  const context = { validLayout, inRange, WIDTH_LIMITS, FONT_LIMITS, document, element, DEFAULT_SETTINGS, loadSettings:()=>new Promise(resolve=>{restore=resolve;}),
    saveSettings:value=>writes.push({...value}), getAnswers:()=>[document.querySelector('#answer')],
    PLUGIN_NAME:'Test', t:(key,values)=>key === 'outputWidthEstimate' ? `${values.width}px (${values.layout}px × ${values.scale})` : key, locale:'en', infoIcon,panelCSS:'',cardCSS:'', CORNER_RADIUS:12,
    requestAnimationFrame:callback=>queueMicrotask(callback),
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
  assert.equal(root.querySelector('#showCredit').checked,true);
  assert.equal(root.querySelector('#showImagePlaceholders').checked,true);
  assert.equal(root.querySelector('#filename').value,'Current conversation');
  assert.equal(root.querySelector('#autoRender').checked, autoRender);
  assert.equal(root.querySelector('#output-width-note').textContent, '');
  if (!autoRender) {
    assert.equal(render,undefined);
    assert.equal(root.querySelector('.rerender').textContent,'startRender');
    root.querySelector('.rerender').click();
  } else {
    assert.equal(typeof render,'function');
    assert.equal(root.querySelector('.rerender').textContent,'generating');
  }
  await render();
  assert.equal(snapshot.format,'jpg');
  assert.equal(snapshot.width,960);
  root.querySelector('[data-value="light"]').click();
  assert.equal(writes.at(-1).theme,'light');
  assert.equal(writes.at(-1).format,'jpg');
  assert.equal(root.querySelector('#compact'), null);
  assert.equal('compact' in writes.at(-1), false);
  root.querySelector('#showImagePlaceholders').checked = false;
  root.querySelector('#showImagePlaceholders').dispatchEvent(new window.Event('change'));
  assert.equal(writes.at(-1).showImagePlaceholders,false);
  root.querySelector('#showCredit').checked = false;
  root.querySelector('#showCredit').dispatchEvent(new window.Event('change'));
  assert.equal(writes.at(-1).showCredit, false);
  assert.equal('filename' in writes.at(-1),false);
  Object.defineProperty(root.querySelector('#widthMode'), 'value', {value:'custom', writable:true});
  root.querySelector('#widthMode').dispatchEvent(new window.Event('change'));
  root.querySelector('#width').value = '599';
  const beforeInvalid = writes.length;
  root.querySelector('#width').dispatchEvent(new window.Event('input'));
  assert.equal(writes.length, beforeInvalid);
  assert.equal(root.querySelector('#width').getAttribute('aria-invalid'), 'true');
  assert.equal(root.querySelector('#output-width-note').textContent, '');
  assert.equal(root.querySelector('.save').disabled, true);
  root.querySelector('#width').value = '1600';
  root.querySelector('#width').dispatchEvent(new window.Event('input'));
  assert.equal(writes.at(-1).width, 1600);
  assert.equal(root.querySelector('#output-width-note').textContent, '3200px (1600px × 2×)');
  root.querySelector('#width').value = '1500';
  root.querySelector('#width').dispatchEvent(new window.Event('input'));
  assert.equal(root.querySelector('#output-width-note').textContent, '3000px (1500px × 2×)');
  root.querySelector('[data-option="fontSize"] [data-value="custom"]').click();
  root.querySelector('#customFontSize').value = '25';
  root.querySelector('#customFontSize').dispatchEvent(new window.Event('input'));
  assert.equal(root.querySelector('#customFontSize').getAttribute('aria-invalid'), 'true');
  root.querySelector('#customFontSize').value = '24';
  root.querySelector('#customFontSize').dispatchEvent(new window.Event('input'));
  assert.equal(writes.at(-1).customFontSize, 24);
  root.querySelector('.rerender').click();
  await render();
  assert.equal(snapshot.width, 1500);
  assert.equal(snapshot.customFontSize, 24);

});

test('completed previews require manual re-render and stale in-flight results never enable export', async () => {
  const {document,window} = parseHTML('<html><body><div id="answer">Answer</div></body></html>');
  document.title = 'Conversation';
  window.HTMLImageElement.prototype.decode = async () => {};
  let render, timers = 0, renders = 0, finish;
  const element = (tag,className,text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    if (tag === 'dialog') { node.showModal = () => {}; node.close = () => {}; }
    return node;
  };
  const source = (await readFile('src/panel.js','utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  const context = {document,element,DEFAULT_SETTINGS,validLayout,inRange,WIDTH_LIMITS,FONT_LIMITS,
    loadSettings:async()=>({...DEFAULT_SETTINGS}),saveSettings:()=>{},getAnswers:()=>[document.querySelector('#answer')],
    PLUGIN_NAME:'Test',t:key=>key,locale:'en',infoIcon,panelCSS:'',cardCSS:'',CORNER_RADIUS:12,
    requestAnimationFrame:callback=>queueMicrotask(callback),
    setTimeout:callback=>{render=callback;timers++;return timers;},clearTimeout:()=>{},isStreaming:()=>false,
    navigator:{clipboard:{write:async()=>{}}},ClipboardItem:class {},URL:{createObjectURL:()=>`blob:${renders}`,revokeObjectURL:()=>{}},
    createCard:async()=>{renders++;return {card:{},warnings:[]};},
    rasterize:async()=>{if(finish) await new Promise(resolve=>{finish=resolve;});return {blob:{size:100},width:760,height:1000,layoutWidth:760};},
  };
  runInNewContext(source,context);
  context.openPanel(document.querySelector('#answer'));
  await Promise.resolve();
  const root = document.querySelector('#answer-imagifier-root').shadowRoot;
  assert.equal(renders,0);
  assert.equal(timers,0);
  assert.equal(root.querySelector('.rerender').textContent,'startRender');
  root.querySelector('[data-option=spacing] [data-value=large]').click();
  assert.equal(timers,0);
  assert.equal(renders,0);
  root.querySelector('.rerender').click();
  await render();
  assert.equal(root.querySelector('.save').disabled,false);
  const initialTimers = timers;
  root.querySelector('#autoRender').checked = true;
  root.querySelector('#autoRender').dispatchEvent(new window.Event('change'));
  assert.equal(timers,initialTimers);
  assert.equal(root.querySelector('.save').disabled,false); // entry preference does not invalidate the image
  root.querySelector('[data-option=theme] [data-value=dark]').click();
  assert.equal(timers,initialTimers);
  assert.equal(root.querySelector('.preview-scroll').classList.contains('is-stale'),true);
  assert.equal(root.querySelector('.preview-image').classList.contains('hidden'),false);
  assert.equal(root.querySelector('.render-overlay').classList.contains('hidden'),false);
  assert.equal(root.querySelector('.save').disabled,true);
  root.querySelector('.rerender').click();
  assert.equal(root.querySelector('.rerender').textContent,'generating');
  assert.equal(root.querySelector('.rerender').disabled,true);
  const count = renders;
  const nextRender = render();
  assert.equal(renders,count); // heavy rendering waits for browser frames
  await nextRender;
  assert.equal(root.querySelector('.preview-scroll').classList.contains('is-stale'),false);
  assert.equal(root.querySelector('.save').disabled,false);
  // A second change while a manual render is pending must not auto-render or
  // publish that obsolete snapshot after it completes.
  root.querySelector('[data-option=spacing] [data-value=standard]').click();
  root.querySelector('.rerender').click();
  finish = true;
  const pending = render();
  for (let i=0; i<15 && typeof finish !== 'function'; i++) await Promise.resolve();
  assert.equal(root.querySelector('.rerender').disabled,true);
  root.querySelector('[data-option=spacing] [data-value=small]').click();
  const before = renders;
  finish(); finish = null;
  await pending;
  assert.equal(renders,before);
  assert.equal(root.querySelector('.save').disabled,true);
  assert.equal(root.querySelector('.rerender').disabled,false);
  root.querySelector('.rerender').click();
  await render();
  assert.equal(root.querySelector('.save').disabled,false);
});
