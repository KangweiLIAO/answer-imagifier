import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {preserveBlockSpacing} from '../src/block-spacing.js';

test('block spacing belongs to outer wrappers without changing inline math or nested content', () => {
  const {document} = parseHTML('<article><div class="answer-content"><div id="chart"><div class="export-image-frame"><svg/></div></div><div id="divider"><hr data-export-component="divider"></div><div id="formula"><span data-export-display-math><span data-math>Formula</span></span></div><div id="code"><pre><code>const x = 1;</code></pre></div><h2 data-export-component="title">Next section</h2><p>Inline <span data-math>math</span>.</p><blockquote><p>Quote</p></blockquote></div></article>');
  preserveBlockSpacing(document.querySelector('article'));
  for (const id of ['chart','formula','code']) assert.equal(document.getElementById(id).getAttribute('data-export-flow'), 'block');
  assert.equal(document.getElementById('divider').getAttribute('data-export-flow'), 'divider');
  assert.equal(document.querySelector('h2').getAttribute('data-export-flow'), 'heading');
  assert.equal(document.querySelectorAll('[data-math][data-export-flow]').length, 0);
  assert.equal(document.querySelector('pre').hasAttribute('data-export-flow'), false);
});

test('component titles and centered grid metrics use component spacing while independent headings keep prose spacing', () => {
  const {document} = parseHTML(`<article><div class="answer-content">
    <div data-export-component="box" data-d-has-border>
      <div data-export-component="row"><div><h2 data-export-component="title">Workspace</h2></div></div>
      <div data-export-component="grid"><div data-export-component="grid-item"><div data-export-component="box"><h1 data-export-component="title">127</h1><p>Items</p></div></div></div>
    </div><div id="prose"><h3>Next steps</h3></div>
  </div></article>`);
  preserveBlockSpacing(document.querySelector('article'));
  assert.equal(document.querySelector('[data-d-has-border] [data-export-flow]'), null);
  assert.equal(document.querySelector('#prose').getAttribute('data-export-flow'), 'heading');
});

test('component separators keep local spacing through wrappers while independent rules retain prose spacing', () => {
  const owners = ['box', 'row', 'grid', 'grid-item', 'form', 'radio-group', 'list', 'list-item'];
  const {document} = parseHTML(`<article><div class="answer-content">
    ${owners.map(type => `<div data-export-component="${type}"><div><span><hr data-export-component="divider"></span></div><hr></div>`).join('')}
    <div data-export-form-layout><div><hr></div></div>
    <div id="independent"><hr data-export-component="divider"></div><hr id="plain">
  </div></article>`);
  preserveBlockSpacing(document.querySelector('article'));
  for (const type of owners) assert.equal(document.querySelector(`[data-export-component="${type}"] [data-export-flow]`), null, type);
  assert.equal(document.querySelector('[data-export-form-layout] [data-export-flow]'), null);
  assert.equal(document.querySelector('#independent').getAttribute('data-export-flow'), 'divider');
  assert.equal(document.querySelector('#plain').getAttribute('data-export-flow'), 'divider');
});

test('component diagram wrappers keep local spacing without promoting media containers to prose blocks', () => {
  const {document} = parseHTML('<article><div class="answer-content"><div data-export-component="grid-item"><div data-export-component="box" data-d-clip="true"><div class="export-image-frame"><img></div></div><div class="diagram"><svg/></div></div><div id="independent"><div class="export-image-frame"><img></div></div></div></article>');
  preserveBlockSpacing(document.querySelector('article'));
  assert.equal(document.querySelector('[data-export-component=grid-item] [data-export-flow]'), null);
  assert.equal(document.querySelector('#independent').getAttribute('data-export-flow'), 'block');
});
