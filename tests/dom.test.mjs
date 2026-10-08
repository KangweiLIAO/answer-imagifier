import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDOM, stubProperties } from './helpers/dom.mjs';
import { loadModule } from './helpers/module.mjs';
import { excludedContent } from '../src/content-filter.js';
import { getAnswers, getPrompt, getTurn, getActionRow, isAnswerReady, isStreaming, isExportableAnswer } from '../src/dom.js';

const fixture = `<div data-content-search-turn-key="one">
<div data-content-search-unit-key="one:0:user"><h4 class="sr-only">You said:</h4><p>First prompt</p></div>
<div class="turn-action-controls" id="user-actions"><button aria-label="Share prompt"></button></div>
<div data-content-search-unit-key="one:2:assistant" id="answer"><h4 class="sr-only">ChatGPT said:</h4><div data-message-author-role="assistant"><p>First block</p><p>Second block</p></div></div>
<div class="turn-action-controls" id="answer-actions"><span><button aria-label="Copy"></button></span></div></div>`;
function setup(t, html) {
  const { document, window } = createDOM(html);
  stubProperties(t, globalThis, { document });
  return { document, window };
}
test('new turns select a whole answer once, associate its prompt and skip user actions', t => {
  const { document } = setup(t, fixture);
  const answers = getAnswers();
  assert.equal(answers.length, 1);
  assert.equal(answers[0].id, 'answer');
  assert.match(answers[0].textContent, /First blockSecond block/);
  assert.equal(getPrompt(answers[0]), 'First prompt');
  assert.equal(getActionRow(answers[0]).id, 'answer-actions');
  document.querySelector('#answer-actions').remove();
  assert.equal(getActionRow(answers[0]), null);
});
test('legacy turns and Share/menu exclusions remain supported', t => {
  setup(t, `<article><div data-message-author-role="user">Legacy prompt</div></article>
  <article><div data-message-author-role="assistant">Legacy answer</div></article>
  <div role="dialog">${fixture}</div><div role="menu">${fixture}</div>`);
  const answers = getAnswers();
  assert.equal(answers.length, 1);
  assert.equal(getPrompt(answers[0]), 'Legacy prompt');
  assert.equal(getTurn(answers[0]).tagName, 'ARTICLE');
});
test('content script reuses buttons, handles replaced answers and streaming completion', async t => {
  const { document, window } = setup(t, fixture);
  let observer, scheduled;
  const opened = [];
  await loadModule('src/content.js', {
    globals: {
      document, Element: window.Element,
      MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
      setTimeout: callback => { scheduled = callback; return 1; },
    },
    mocks: { 'src/panel.js': { openPanel: answer => opened.push(answer), exportIcon: '<svg></svg>' } },
  });
  const rescan = () => { observer([{ target: document.body }]); scheduled(); };
  rescan(); rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 1);
  let button = document.querySelector('[data-answer-imagifier]');
  assert.equal(button.parentElement.id, 'answer-actions');
  button.click();
  assert.equal(opened[0], document.querySelector('#answer'));
  const replacement = document.querySelector('#answer').cloneNode(true);
  document.querySelector('#answer').replaceWith(replacement);
  rescan();
  button = document.querySelector('[data-answer-imagifier]');
  button.click();
  assert.equal(opened[1], replacement);
  document.body.innerHTML = fixture;
  document.querySelector('#answer').setAttribute('data-is-streaming', 'true');
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 0);
  document.querySelector('#answer').removeAttribute('data-is-streaming');
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 1);
  document.querySelector('#answer-actions').remove();
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 0);
  document.querySelector('#answer p').textContent += ' still streaming';
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 0);
  const row = document.createElement('div');
  row.className = 'turn-action-controls';
  row.innerHTML = '<button aria-label="Copy"></button>';
  document.querySelector('#answer').after(row);
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 1);
  document.querySelector('#answer').setAttribute('data-is-streaming', 'true');
  rescan();
  assert.equal(document.querySelectorAll('[data-answer-imagifier]').length, 0);
});

test('hidden speaker headings are omitted and do not make an empty answer exportable', t => {
  const { document } = setup(t, fixture);
  const answer = document.querySelector('#answer');
  assert.ok(excludedContent(answer).has(answer.querySelector('h4')));
  answer.innerHTML = '<h4 class="sr-only">ChatGPT said:</h4>';
  assert.equal(getAnswers().length, 0);
});

test('new answers wait for native actions even when old streaming markers are absent', t => {
  const { document } = setup(t, fixture);
  const answer = document.querySelector('#answer');
  assert.equal(isAnswerReady(answer), true);
  document.querySelector('#answer-actions').innerHTML = '<button data-answer-imagifier="export">Export image</button>';
  assert.equal(isAnswerReady(answer), false);
  document.querySelector('#answer-actions').remove();
  assert.equal(isStreaming(), false);
  assert.equal(isAnswerReady(answer), false);
  answer.querySelector('p').textContent += ' more tokens';
  assert.equal(isAnswerReady(answer), false);
});

test('answer previews inside native dialogs and menus are not export targets', () => {
  const answer = (closestResult, textContent = 'answer') => ({ textContent, closest: () => closestResult, cloneNode() { return { textContent, querySelectorAll: () => [] }; } });
  assert.equal(isExportableAnswer(answer(null)), true);
  assert.equal(isExportableAnswer(answer({ role: 'dialog' })), false);
  assert.equal(isExportableAnswer(answer(null, '   ')), false);
});
