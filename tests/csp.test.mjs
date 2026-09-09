import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { htmlToImageCsp } from '../scripts/html-to-image-csp.mjs';

test('bundled resource resolver works without DOM creation under base-uri none', async () => {
  const result = await build({
    stdin: { contents: 'export { resolveUrl } from "html-to-image/es/util.js";', resolveDir: process.cwd() },
    bundle: true, write: false, format: 'iife', globalName: 'resolver', plugins: [htmlToImageCsp],
  });
  const context = { URL, document: { baseURI: 'https://chatgpt.com/c/example' } };
  runInNewContext(result.outputFiles[0].text, context);
  const resolve = context.resolver.resolveUrl;
  const css = 'https://chatgpt.com/cdn/assets/root.css';
  assert.equal(resolve('./font.woff2', css), 'https://chatgpt.com/cdn/assets/font.woff2');
  assert.equal(resolve('../fonts/math.woff2', css), 'https://chatgpt.com/cdn/fonts/math.woff2');
  assert.equal(resolve('/fonts/math.woff2?v=1#x', css), 'https://chatgpt.com/fonts/math.woff2?v=1#x');
  assert.equal(resolve('//cdn.example.com/font.woff2', css), 'https://cdn.example.com/font.woff2');
  assert.equal(resolve('data:font/woff2;base64,AA==', css), 'data:font/woff2;base64,AA==');
  assert.equal(resolve('./file', null), 'https://chatgpt.com/c/file');
  const bundle = await readFile('dist/content.js', 'utf8');
  assert.ok(!/createElement\(["']base["']\)/.test(bundle), 'Production bundle retained the CSP-violating base element');
});
