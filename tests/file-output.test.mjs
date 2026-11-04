import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileName, exportScale } from '../src/dom.js';

test('long exports stay inside memory and canvas limits without clipping', () => {
  for (const height of [1000, 8000, 16000, 21000]) {
    const scale = exportScale(960, height, 3);
    assert.ok(height * scale <= 16000);
    assert.ok(960 * height * scale * scale <= 32_000_000 + 1);
  }
  assert.throws(() => exportScale(960, 30000, 3), /回答过长|size limit/);
});

test('download names do not contain invalid filename characters', () => {
  assert.equal(fileName('A/B: C?*', 'png'), 'AB C.png');
  assert.equal(fileName('///', 'jpg'), 'ChatGPT-answer.jpg');
  assert.equal(fileName('My answer.png', 'jpg'), 'My answer.jpg');
});

test('generic ChatGPT page titles use an answer heading for the filename', async () => {
  const {answerTitle} = await import('../src/dom.js');
  const answer = {querySelector: () => ({textContent:'Quadratic formula'})};
  assert.equal(answerTitle(answer, 'ChatGPT: Chat, Work, Create & Code with AI'), 'Quadratic formula');
  assert.equal(answerTitle(answer, 'Named conversation - ChatGPT'), 'Named conversation');
  assert.equal(answerTitle(null, 'ChatGPT'), 'ChatGPT-answer');
});
