import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/settings.js';
import { createBrowser } from './helpers/browser.mjs';
import { loadModule } from './helpers/module.mjs';
import { readFixture } from './helpers/dom.mjs';

async function setup(t, markup, extraGlobals = {}) {
  const { document, globals } = createBrowser(t, `<main data-message-author-role="assistant">${markup}</main><div id="mount"></div>`);
  const source = document.querySelector('main');
  const mount = document.querySelector('#mount');
  let preparedCard;
  const { createCard } = await loadModule('src/render.js', {
    globals: { ...globals, ...extraGlobals },
    mocks: {
      // Resource decoding and PNG output require a real browser. All snapshot,
      // adapter, cleanup, card assembly and layout stages run unmodified.
      'src/export/resources.js': { prepareResources: async card => { assert.equal(mount.firstElementChild, card); preparedCard = card; } },
      'src/export/rasterize.js': { rasterize: async () => { throw Error('PNG output is covered by browser verification'); } },
    },
  });
  return {
    source,
    render: async (options = {}, target = source) => {
      const result = await createCard(target, { ...DEFAULT_SETTINGS, showCredit: false, ...options }, mount);
      assert.equal(preparedCard, result.card);
      return { ...result, output: result.card.querySelector('.answer-content') };
    },
  };
}

test('real Writing block retains semantic content instead of becoming a plain textbox', async t => {
  const { source, render } = await setup(t, await readFixture('writing-block'));
  const editor = source.querySelector('[role="textbox"]');
  editor.querySelector('h1').textContent = 'Edited document title';
  const before = source.outerHTML;
  const { output } = await render();
  const block = output.querySelector('[data-export-writing-block]');
  assert.ok(block);
  for (const tag of ['h1', 'h2', 'p', 'ul', 'li', 'strong', 'code']) assert.equal(block.querySelectorAll(tag).length, editor.querySelectorAll(tag).length, tag);
  assert.equal(block.querySelector('h1').textContent, 'Edited document title');
  assert.equal(block.textContent, editor.textContent);
  assert.equal(block.querySelector('[role="textbox"],[contenteditable],button,[data-export-form-control]'), null);
  assert.equal(output.querySelector('[data-markdown-copy-text],[data-oai-writing-block-surface]'), null);
  assert.match(output.textContent, /这版针对前面训练中/);
  assert.equal(source.outerHTML, before);
});

test('a Writing surface can be exported alone using current rich editor content', async t => {
  const { source, render } = await setup(t, await readFixture('writing-block'));
  const surface = source.querySelector('[data-oai-writing-block-surface]');
  const editor = surface.querySelector('[role="textbox"]');
  editor.querySelector('h1').textContent = 'Current edited title';
  const before = source.outerHTML;
  const { output } = await render({ prompt: false }, surface);
  assert.ok(output.matches('[data-export-writing-block]'));
  assert.equal(output.textContent, editor.textContent);
  for (const tag of ['h1', 'h2', 'p', 'ul', 'li', 'strong', 'code']) assert.equal(output.querySelectorAll(tag).length, editor.querySelectorAll(tag).length, tag);
  assert.equal(output.querySelector('button,[role="textbox"],[data-markdown-copy-text]'), null);
  assert.doesNotMatch(output.textContent, /这版针对前面训练中/);
  assert.equal(source.outerHTML, before);
});

test('Writing block adaptation does not change ordinary textboxes or textarea conversion', async t => {
  const { render } = await setup(t, '<div data-testid="chatgpt-writing-block"><div role="textbox" aria-multiline="true"><h2>Document</h2><p><strong>Rich text</strong></p></div><button>Copy</button></div><div role="textbox" aria-valuetext="Form answer">Form answer</div><textarea>Long answer</textarea>');
  const { output } = await render();
  assert.equal(output.querySelector('[data-export-writing-block] h2').textContent, 'Document');
  assert.equal(output.querySelector('[data-export-form-control=input]').textContent, 'Form answer');
  assert.equal(output.querySelector('[data-export-form-control=textarea]').textContent, 'Long answer');
});

test('real checklist plan retains all task labels, live states and progress shapes', async t => {
  const { source, render } = await setup(t, await readFixture('checklist-plan'));
  source.querySelector('[role=checkbox]').setAttribute('aria-checked', 'true');
  const before = source.outerHTML;
  const labels = [...source.querySelectorAll('label')].map(label => label.textContent);
  const { output } = await render({ fontSize: 'small', widthMode: 'custom', width: 600 });
  const rows = [...output.querySelectorAll('[data-export-checklist-row]')];
  assert.equal(rows.length, 16);
  assert.deepEqual(rows.map(row => row.querySelector('label').textContent), labels);
  assert.equal(rows[0].getAttribute('data-checklist-state'), 'checked');
  assert.equal(rows.filter(row => row.getAttribute('data-checklist-state') === 'unchecked').length, 15);
  assert.equal(output.querySelectorAll('[data-export-shape]').length, source.querySelectorAll('[data-d-has-height]').length);
  assert.equal(output.querySelectorAll('[data-d-has-border]').length, 4);
  assert.equal(output.querySelector('button,[role=checkbox]'), null);
  assert.match(output.textContent, /最终验收标准/);
  assert.equal(source.outerHTML, before);
});

test('schedule survives snapshot and cleanup with six cards and all fixed time columns', async t => {
  const { source, render } = await setup(t, await readFixture('expo-schedule'));
  const before = source.outerHTML;
  const text = source.textContent;
  const { output } = await render({ widthMode: 'custom', width: 600, fontSize: 'large' });
  assert.equal(output.querySelectorAll('[data-d-has-border]').length, 6);
  const columns = [...output.querySelectorAll('[data-d-has-width]')];
  assert.equal(columns.length, 22);
  assert.ok(columns.every(column => column.style.width === '100px'));
  assert.equal(output.querySelector('[data-export-shape]'), null);
  assert.equal(output.textContent, text);
  assert.equal(source.outerHTML, before);
});

test('workspace retains centered metric labels, intrinsic inline link groups and component heading ownership', async t => {
  const { source, render } = await setup(t, await readFixture('interview-workspace'));
  const original = source.outerHTML;
  const { output } = await render();
  const grid = output.querySelector('[data-export-component=grid]');
  assert.deepEqual([...grid.querySelectorAll('p')].map(e => e.textContent), ['英文问答', '通用主题', '初始公司档案']);
  assert.equal(grid.querySelector('[data-export-flow]'), null);
  assert.equal(output.querySelector('[data-d-has-border] [data-export-flow]'), null);
  const groups = [...output.querySelectorAll('[data-d-inline][data-export-width]')];
  assert.equal(groups.length, 2);
  assert.ok(groups.every(group => group.style.width === 'max-content' && group.getAttribute('data-export-width') === 'max-content' && group.querySelector('svg[data-export-icon]')));
  assert.equal(output.querySelectorAll('[data-export-flow=heading]').length, 2);
  assert.equal(source.outerHTML, original);
});

test('review widget preserves live mode, all six notes and local separator ownership through the complete pipeline', async t => {
  const {source, render} = await setup(t, await readFixture('interview-review'));
  const radios = [...source.querySelectorAll('[data-d-component=segmented-control] [role=radio]')];
  radios.forEach((radio, i) => radio.setAttribute('aria-checked', String(i === radios.length - 1)));
  const original = source.outerHTML;
  const {output} = await render({widthMode: 'custom', width: 600, fontSize: 'large'});
  const group = output.querySelector('[data-export-form-control=segmented]');
  assert.ok(group.hasAttribute('data-export-block'));
  assert.equal(group.querySelector('[data-export-selected=true]').textContent, radios.at(-1).textContent.trim());
  assert.equal(output.querySelectorAll('hr[data-export-component=divider]').length, 7);
  assert.equal(output.querySelector('[data-d-has-border] [data-export-flow]'), null);
  for (const text of ['System Architecture', '50% Throughput', '30% Inference Performance', '98% Feature Generation', 'Docker & 40% Setup Time', 'Refactoring & BLE']) assert.ok(output.textContent.includes(text), text);
  assert.equal(output.querySelector('button,[role=radio],[role=combobox]'), null);
  assert.equal(output.querySelectorAll('[data-export-form-control=arrow]').length, 1);
  assert.equal(output.querySelector('[data-export-form-control=select]').getAttribute('data-export-width'), '100%');
  assert.equal(source.outerHTML, original);
});

test('structured training flow keeps connector row intent, centered captions and inline metric icons', async t => {
  const {source, render} = await setup(t, await readFixture('training-flow'));
  const original = source.outerHTML;
  const {output} = await render({widthMode: 'custom', width: 600, fontSize: 'large'});
  const rows = [...output.querySelectorAll('[data-export-component=row][data-d-justify=center]')];
  const connectors = rows.filter(row => row.children.length === 1 && row.firstElementChild.localName === 'svg');
  assert.equal(connectors.length, 4);
  assert.ok(connectors.every(row => row.firstElementChild.hasAttribute('data-export-icon')));
  const metric = rows.find(row => row.querySelector('h2'));
  assert.deepEqual([...metric.children].map(node => node.localName), ['h2', 'svg', 'h2']);
  assert.equal(output.querySelectorAll('svg[data-export-icon]').length, 5);
  assert.equal(output.querySelectorAll('[data-d-text-align=center]').length, 2);
  assert.equal(output.querySelector('.export-image-frame'), null);
  assert.equal(output.querySelector('[data-export-flow]'), null);
  assert.equal(output.querySelectorAll('[data-export-component=grid-item]').length, 3);
  assert.equal(source.outerHTML, original);
});

test('public export pipeline captures visualization before cleanup and preserves the source iframe', async t => {
  const origin = 'https://codex-inline-visualization-test.web-sandbox.oaiusercontent.com';
  let listener;
  const child = { postMessage: request => queueMicrotask(() => listener({ source: child, origin, data: {
    ...request, type: 'result', ok: true, png: 'data:image/png;base64,aGVsbG8=', width: 800, height: 1000,
  } })) };
  const host = {
    crypto: { randomUUID: () => 'unique' }, setTimeout, clearTimeout,
    addEventListener: (_, callback) => { listener = callback; }, removeEventListener() {},
  };
  const { source, render } = await setup(t, `<p>Diagram</p><iframe title="Overflow" src="${origin}/"></iframe>`, { URL, window: host });
  source.querySelector('iframe').contentWindow = child;
  const before = source.outerHTML;
  const { output, warnings } = await render();
  assert.equal(output.querySelector('[data-export-iframe-snapshot]').alt, 'Overflow');
  assert.equal(output.querySelector('iframe,.asset-warning,.export-image-frame'), null);
  assert.equal(warnings.length, 0);
  assert.equal(source.outerHTML, before);
});

test('hiding images removes photo frames before resource preparation and keeps recommendation text', async t => {
  const { render } = await setup(t, await readFixture('network-image-cards'));
  const { output } = await render({ showImages: false });
  assert.equal(output.querySelector('img,[data-d-component="image"],[data-export-image-placeholder],[data-export-network-image-container]'), null);
  assert.match(output.textContent, /Fit4Less/);
  assert.match(output.textContent, /Planet Fitness/);
});

for (const name of ['map-route', 'map-tour']) {
  test(`saved ${name} DOM reports missing map pixels instead of exporting empty space or gesture hints`, async t => {
    const markup = await readFixture(name);
    const { source, render } = await setup(t, markup, { setTimeout, clearTimeout });
    const before = source.outerHTML;
    const { output, warnings } = await render();
    assert.equal(output.querySelector('[data-testid="businesses-map-widget"],canvas'), null);
    assert.ok(output.querySelector('.asset-warning'));
    assert.ok(warnings.some(message => message.includes('Some maps')));
    assert.doesNotMatch(output.textContent, /Use two fingers|scroll to zoom/);
    assert.equal(source.outerHTML, before);
  });
}

test('standalone structured paragraphs keep block spacing without expanding card or list text', async t => {
  const { source, render } = await setup(t, '<div><p data-d-component="text" data-d-text-flow>Intro</p><p data-d-component="text" data-d-text-flow>Recommendation</p><div data-d-component="box" data-d-has-border><p data-d-component="text" data-d-text-flow>Card text</p></div><ul><li><p data-d-component="text" data-d-text-flow>List text</p></li></ul></div>');
  const before = source.outerHTML;
  const { output } = await render();
  assert.deepEqual([...output.querySelectorAll('[data-export-flow="paragraph"]')].map(p => p.textContent), ['Intro', 'Recommendation']);
  assert.equal(output.querySelector('[data-export-component="box"] p').hasAttribute('data-export-flow'), false);
  assert.equal(output.querySelector('li p').hasAttribute('data-export-flow'), false);
  assert.equal(source.outerHTML, before);
});

test('real network photo cards preserve all images, crop positions and authored frames', async t => {
  const { source, render } = await setup(t, await readFixture('network-image-cards'));
  const before = source.outerHTML;
  const { output } = await render();
  assert.equal(output.querySelectorAll('img[data-export-network-image]').length, 3);
  assert.equal(output.querySelectorAll('[data-export-network-image-container]').length, 3);
  assert.equal(output.querySelector('[data-d-image-loading],button,[data-export-image-placeholder]'), null);
  assert.equal(output.querySelector('img').style.objectPosition, '17.8% 50%');
  for (const frame of output.querySelectorAll('[data-export-network-image-container]')) {
    assert.equal(frame.style.maxWidth, '132px');
    assert.equal(frame.style.height, 'auto');
    assert.equal(frame.style.aspectRatio, '4 / 5');
    assert.equal(frame.hasAttribute('data-export-shape'), false);
  }
  assert.match(output.textContent, /Fit4Less/);
  assert.match(output.textContent, /Planet Fitness/);
  assert.equal(source.outerHTML, before);
});

test('mixed export snapshots preserve live form and checklist states without mutating the answer', async t => {
  const { source, render } = await setup(t, '<form data-d-component="form"><label>Name<input value="old"></label><label><input type="checkbox">Option</label><button>Submit</button></form><ul><li><input type="checkbox">Task</li></ul><p><span data-d-component="pressable" data-d-inline role="button">Entity</span></p><pre><code class="language-js">const answer = 42;</code></pre>');
  source.querySelector('input').value = 'current';
  source.querySelector('form input[type=checkbox]').checked = true;
  source.querySelector('li input').indeterminate = true;
  const before = source.outerHTML;
  const { output } = await render();
  assert.equal(output.querySelector('[data-export-form-control=input]').textContent, 'current');
  assert.equal(output.querySelectorAll('[data-export-form-control=checkbox]').length, 1);
  assert.equal(output.querySelector('[data-export-form-control=checkbox]').getAttribute('data-checklist-box'), 'checked');
  assert.equal(output.querySelector('li svg').getAttribute('data-checklist-box'), 'mixed');
  assert.equal(output.querySelector('[data-export-entity]').textContent, 'Entity');
  assert.match(output.querySelector('pre code').textContent, /const answer = 42/);
  assert.ok(output.querySelector('pre[data-export-flow]')); // real layout stage ran
  assert.equal(output.querySelector('button,input,[role=button]'), null);
  assert.equal(source.outerHTML, before);
  assert.equal(source.querySelector('input').value, 'current');
});

test('cleanup preserves adapted content and reports unsupported embeds after removing unsafe attributes', async t => {
  const { render } = await setup(t, '<p onclick="bad()"><a href="javascript:bad()">Text</a></p><script>bad()</script><iframe srcdoc="bad()"></iframe><div data-d-component="box" data-d-has-height data-d-has-width style="height:4px;width:0%"></div><div></div><input type="checkbox">');
  const { output, warnings } = await render();
  assert.equal(output.querySelector('[onclick],[srcdoc],script,iframe,input'), null);
  assert.equal(output.querySelector('a').hasAttribute('href'), false);
  assert.equal(output.querySelector('[data-export-shape]').style.width, '0%');
  assert.equal(output.querySelectorAll('.asset-warning').length, 1);
  assert.equal(warnings.length, 1);
  assert.equal(output.querySelectorAll('div').length, 1);
});

test('native Mermaid is recovered from the source after ordinary image filtering', async t => {
  const { source, render } = await setup(t, '<pre><div data-code-block-preview-pane="mermaid"><img src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E"></div></pre><img src="ordinary.png">');
  const sourceImage = source.querySelector('pre img');
  sourceImage.getBoundingClientRect = () => ({ width: 320 });
  const { output } = await render();
  assert.equal(output.querySelectorAll('img').length, 1);
  assert.ok(output.querySelector('.native-diagram img'));
  assert.equal(output.querySelector('pre'), null);
});

test('card assembly preserves prompt, theme and optional credit through the public entry point', async t => {
  const { source, render } = await setup(t, '<p>Answer content</p>');
  const prompt = source.ownerDocument.createElement('div');
  prompt.setAttribute('data-message-author-role', 'user');
  prompt.textContent = 'Original question';
  source.before(prompt);
  const { card } = await render({ theme: 'dark', prompt: true, showCredit: true, fontSize: 'custom', customFontSize: 22, spacing: 'large' });
  assert.equal(card.dataset.theme, 'dark');
  assert.equal(card.dataset.fontSize, 'custom');
  assert.equal(card.dataset.spacing, 'large');
  assert.equal(card.style.getPropertyValue('--body-font-size'), '22px');
  assert.equal(card.querySelector('.prompt').textContent, 'Original question');
  assert.match(card.querySelector('.credit').textContent, /Answer Imagifier/);
  assert.match(card.querySelector('.plugin-logo').src, /^data:image\/png;base64,/);
  assert.equal(card.querySelector('.wordmark').textContent.trim(), 'ChatGPT');
  const withoutCredit = await render();
  assert.equal(withoutCredit.card.querySelector('.credit,.prompt'), null);
});

test('assessment exports all disabled answers, wrong-answer icon and partial progress before button cleanup', async t => {
  const { source, render } = await setup(t, await readFixture('assessment'));
  const before = source.outerHTML;
  const { output } = await render();
  const choices = [...output.querySelectorAll('[data-export-answer-option]')];
  assert.deepEqual(choices.map(choice => choice.textContent), [
    'A. A larger relational database', 'B. A message queue', 'C. Client-side caching only',
  ]);
  assert.equal(choices[0].querySelectorAll('svg[data-export-icon] path').length, 2);
  assert.equal(choices[1].querySelector('svg'), null);
  assert.match(output.textContent, /Review this concept/);
  assert.doesNotMatch(output.textContent, /Next question/);
  assert.equal(output.querySelector('[data-export-progress-fill]').style.width, '33.3333%');
  assert.equal(output.querySelector('button,[role=button],[disabled],[tabindex]'), null);
  assert.equal(source.outerHTML, before);
});

test('answer choices preserve live selection and remain content inside a form while ordinary actions are removed', async t => {
  const { source, render } = await setup(t, '<form><input value="current"><div data-d-component="box" data-d-direction="col"><button data-d-component="pressable" data-d-has-border data-d-direction="row" aria-pressed="false"><p data-d-component="text">First choice</p></button><button data-d-component="pressable" data-d-has-border data-d-direction="row" aria-pressed="false"><p data-d-component="text">Second choice</p></button></div><button data-d-component="pressable" data-d-has-border data-d-direction="row"><p data-d-component="text">Submit</p></button><div data-d-component="row"><button>Reset</button><button>Copy</button></div></form>');
  source.querySelectorAll('[aria-pressed]')[1].setAttribute('aria-pressed', 'true');
  const { output } = await render();
  assert.deepEqual([...output.querySelectorAll('[data-export-answer-option]')].map(choice => choice.getAttribute('data-export-selected')), ['false', 'true']);
  assert.match(output.textContent, /First choiceSecond choice/);
  assert.doesNotMatch(output.textContent, /Submit|Reset|Copy/);
  assert.equal(output.querySelector('[aria-pressed],button'), null);
});

test('select and date exports share the SVG chevron while retaining a separate calendar icon', async t => {
  const { render } = await setup(t, '<form><span data-d-component="select"><span role="button">Production</span></span><span data-d-component="date-picker"><span role="button">Choose a date</span></span></form>');
  const { output } = await render();
  const select = output.querySelector('[data-export-form-control=select]');
  const date = output.querySelector('[data-export-form-control=date]');
  assert.equal(select.textContent, 'Production');
  assert.equal(date.textContent, 'Choose a date');
  assert.equal(select.querySelector('svg[data-export-form-control=arrow]').outerHTML, date.querySelector('svg[data-export-form-control=arrow]').outerHTML);
  assert.equal(date.querySelectorAll('svg').length, 2);
  assert.ok(date.querySelector('svg[data-export-form-control=calendar]'));
  assert.equal(output.querySelector('span[data-export-form-control=arrow],button,[role=button]'), null);
});

test('mixed photo and SVG cards share container geometry through cleanup at every diagram size', async t => {
  const {source, render} = await setup(t, await readFixture('mixed-media-grid'));
  const before = source.outerHTML;
  for (const diagramSize of ['small', 'standard', 'large']) {
    const {output} = await render({diagramSize});
    assert.equal(output.querySelectorAll('[data-export-component=grid-item]').length, 4);
    assert.equal(output.querySelectorAll('[data-export-media]').length, 2);
    assert.equal(output.querySelectorAll('[data-export-network-image]').length, 2);
    assert.equal(output.querySelector('.export-image-frame,[data-export-flow],button'), null);
    assert.ok([...output.querySelectorAll('[data-export-media]')].every(img => img.style.width === '100%'));
    assert.equal(output.querySelectorAll('h3').length, 4);
  }
  const {output} = await render({showImages:false});
  assert.equal(output.querySelector('[data-export-network-image]'), null);
  assert.equal(output.querySelectorAll('[data-export-media]').length, 2);
  assert.equal(source.outerHTML, before);
});

test('nested criterion checkbox labels retain their actual row owner and current state', async t => {
  const {source,render}=await setup(t,await readFixture('opportunity-checklist'));
  const controls=source.querySelectorAll('[role=checkbox]');
  controls[0].setAttribute('aria-checked','true');
  controls[1].setAttribute('aria-checked','mixed');
  const before=source.outerHTML;
  const {output}=await render({widthMode:'custom',width:600,fontSize:'large'});
  const markers=[...output.querySelectorAll('[data-component-checkbox]')];
  assert.equal(markers.length,5);
  assert.deepEqual(markers.map(m=>m.getAttribute('data-checklist-box')),['checked','mixed','unchecked','unchecked','unchecked']);
  for(const marker of markers){
    assert.ok(marker.parentElement.hasAttribute('data-export-checklist-row'));
    assert.ok(marker.parentElement.querySelector('label'));
    assert.equal(marker.parentElement.parentElement.hasAttribute('data-export-checklist-row'),false);
  }
  assert.equal(output.querySelector('button,[role=checkbox]'),null);
  assert.equal(output.querySelectorAll('label p').length,10);
  assert.equal(source.outerHTML,before);
});
