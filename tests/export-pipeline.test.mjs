import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/settings.js';
import { createBrowser } from './helpers/browser.mjs';
import { loadModule } from './helpers/module.mjs';

async function setup(t, markup) {
  const { document, globals } = createBrowser(t, `<main data-message-author-role="assistant">${markup}</main><div id="mount"></div>`);
  const source = document.querySelector('main');
  const mount = document.querySelector('#mount');
  let preparedCard;
  const { createCard } = await loadModule('src/render.js', {
    globals,
    mocks: {
      // Resource decoding and PNG output require a real browser. All snapshot,
      // adapter, cleanup, card assembly and layout stages run unmodified.
      'src/export/resources.js': { prepareResources: async card => { assert.equal(mount.firstElementChild, card); preparedCard = card; } },
      'src/export/rasterize.js': { rasterize: async () => { throw Error('PNG output is covered by browser verification'); } },
    },
  });
  return {
    source,
    render: async (options = {}) => {
      const result = await createCard(source, { ...DEFAULT_SETTINGS, showCredit: false, ...options }, mount);
      assert.equal(preparedCard, result.card);
      return { ...result, output: result.card.querySelector('.answer-content') };
    },
  };
}

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
