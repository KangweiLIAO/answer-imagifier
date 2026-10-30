import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension injects the UI on ChatGPT and capture worker only on visualization sandbox frames', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.json'));
  assert.equal(manifest.name, 'Answer Imagifier: ChatGPT Long Screenshot & Answer to Image');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*', 'https://chat.openai.com/*']);
  assert.deepEqual(manifest.content_scripts[1].matches, ['https://*.web-sandbox.oaiusercontent.com/*']);
  assert.deepEqual(manifest.content_scripts[1].js, ['frame.js']);
  assert.equal(manifest.content_scripts[1].all_frames, true);
  assert.ok((await readFile('dist/frame.js', 'utf8')).length > 0);
  assert.deepEqual(manifest.content_scripts[2].matches, manifest.content_scripts[0].matches);
  assert.deepEqual(manifest.content_scripts[2].js, ['map-buffer.js']);
  assert.equal(manifest.content_scripts[2].world, 'MAIN');
  assert.equal(manifest.content_scripts[2].run_at, 'document_start');
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://images.openai.com/*']);
  assert.equal(manifest.background.service_worker, 'image-worker.js');
  assert.ok((await readFile('dist/image-worker.js', 'utf8')).length > 0);
});
