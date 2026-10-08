import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension only injects on ChatGPT and only requests settings storage permission', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.json'));
  assert.equal(manifest.name, 'Answer Imagifier - for ChatGPT');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*', 'https://chat.openai.com/*']);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
});
