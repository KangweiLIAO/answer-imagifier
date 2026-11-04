import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { htmlToImageFonts } from '../scripts/html-to-image-fonts.mjs';

async function fontEmbedder(plugins) {
  const bundle = await build({ stdin: { contents: "export {embedResources} from 'html-to-image/es/embed-resources.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'library', plugins });
  const scope = {};
  runInNewContext(bundle.outputFiles[0].text, scope);
  return scope.library.embedResources;
}

test('each font face retains its own preferred source across repeated exports', async () => {
  const patched = await fontEmbedder([htmlToImageFonts]);
  const original = await fontEmbedder([]);
  const rules = ['Bold', 'Italic', 'Regular'].map((face, index) => `@font-face {font-family:KaTeX_Main;font-weight:${index === 0 ? 700 : 400};font-style:${index === 1 ? 'italic' : 'normal'};src: url("data:font/woff2;base64,${face}") format("woff2"), url("data:font/woff;base64,${face}") format("woff");}`);
  const options = {preferredFontFormat:'woff2'};
  const broken = [];
  for (const rule of rules) broken.push(await original(rule, null, options));
  assert.ok(broken.some(rule => !rule.includes('src:')), 'reproduce the upstream state leak');
  for (let pass = 0; pass < 3; pass++) {
    for (const rule of rules) {
      const css = await patched(rule, null, options);
      assert.match(css, /src: url\("data:font\/woff2/);
      assert.equal(css.match(/base64,[^"]+/)[0], rule.match(/base64,[^"]+/)[0]);
      assert.doesNotMatch(css, /format\("woff"\)/);
    }
  }
});
