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
