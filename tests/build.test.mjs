import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension injects the UI on ChatGPT and capture worker only on visualization sandbox frames', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.json'));
  assert.equal(manifest.name, 'Answer Imagifier - for ChatGPT');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*', 'https://chat.openai.com/*']);
  assert.deepEqual(manifest.content_scripts[1].matches, ['https://*.web-sandbox.oaiusercontent.com/*']);
  assert.deepEqual(manifest.content_scripts[1].js, ['frame.js']);
  assert.equal(manifest.content_scripts[1].all_frames, true);
  assert.ok((await readFile('dist/frame.js', 'utf8')).length > 0);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
});
