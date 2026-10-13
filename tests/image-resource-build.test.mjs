import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { htmlToImageResources } from '../scripts/html-to-image-resources.mjs';

test('the production html-to-image patch uses supplied resources before the normal fetch/cache path', async () => {
  const bundle = await build({ stdin: { contents: "export {resourceToDataURL} from 'html-to-image/es/dataurl.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'library', plugins: [htmlToImageResources] });
  let fetched = 0;
  const scope = { fetch: async () => { fetched++; throw new Error('Should not fetch'); }, console: { warn() {} } };
  runInNewContext(bundle.outputFiles[0].text, scope);
  const url = 'https://images.openai.com/static-rsc-4/photo';
  assert.equal(await scope.library.resourceToDataURL(url, 'image/png', {}), '');
  assert.equal(fetched, 1);
  assert.equal(await scope.library.resourceToDataURL(url, 'image/png', { resourceLoader: async () => 'data:image/png;base64,AQID' }), 'data:image/png;base64,AQID');
  assert.equal(fetched, 1);
});
