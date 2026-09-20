import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileName, exportScale, isExportableAnswer } from '../src/dom.js';
import { inheritMathForeground } from '../src/math-style.js';
import { normalizeCodeLanguage } from '../src/code-language.js';
import { readFile } from 'node:fs/promises';

function styleDeclaration(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getPropertyValue: property => values.get(property) || '',
    setProperty: (property, value) => values.set(property, value),
  };
}
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

test('export controls for typography, spacing, and file names are bundled', async () => {
  const bundle = await readFile('dist/content.js', 'utf8');
  assert.match(bundle, /data-option="fontSize"/);
  assert.match(bundle, /id="compact"/);
  assert.match(bundle, /id="filename"/);
  assert.match(bundle, /data-font-size/);
  assert.match(bundle, /data-compact/);
});
test('extension only injects on ChatGPT and requires no privileged permissions', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.json'));
  assert.equal(manifest.name, 'Answer Imagifier - for ChatGPT');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*', 'https://chat.openai.com/*']);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test('rendered header uses the plugin credit and embedded logo', async () => {
  const bundle = await readFile('dist/content.js', 'utf8');
  assert.doesNotMatch(bundle, /Answer excerpt|回答摘录/);
  assert.match(bundle, /plugin-logo/);
  assert.match(bundle, /data:image\/png;base64/);
});

test('answer previews inside native dialogs and menus are not export targets', () => {
  const answer = (closestResult, textContent = 'answer') => ({ textContent, closest: () => closestResult, cloneNode() { return { textContent, querySelectorAll: () => [] }; } });
  assert.equal(isExportableAnswer(answer(null)), true);
  assert.equal(isExportableAnswer(answer({ role: 'dialog' })), false);
  assert.equal(isExportableAnswer(answer(null, '   ')), false);
});

test('copied math foreground follows the export theme', () => {
  const htmlMath = { namespaceURI: 'http://www.w3.org/1999/xhtml', style: styleDeclaration() };
  inheritMathForeground(htmlMath);
  assert.equal(htmlMath.style.getPropertyValue('color'), 'inherit');
  assert.equal(htmlMath.style.getPropertyValue('-webkit-text-fill-color'), 'currentColor');
  assert.equal(htmlMath.style.getPropertyValue('border-bottom-color'), 'currentColor');

  const svgGlyph = {
    namespaceURI: 'http://www.w3.org/2000/svg',
    style: styleDeclaration({ fill: 'rgb(0, 0, 0)', stroke: 'none' }),
  };
  inheritMathForeground(svgGlyph);
  assert.equal(svgGlyph.style.getPropertyValue('fill'), 'currentColor');
  assert.equal(svgGlyph.style.getPropertyValue('stroke'), 'none');
});

test('code language labels are normalized before highlighting', () => {
  const supported = language => ['javascript', 'typescript', 'cpp', 'csharp', 'bash', 'xml', 'yaml'].includes(language);
  assert.equal(normalizeCodeLanguage(' JavaScript ', supported), 'javascript');
  assert.equal(normalizeCodeLanguage('TSX', supported), 'typescript');
  assert.equal(normalizeCodeLanguage('C++', supported), 'cpp');
  assert.equal(normalizeCodeLanguage('C#', supported), 'csharp');
  assert.equal(normalizeCodeLanguage('zsh', supported), 'bash');
  assert.equal(normalizeCodeLanguage('HTML', supported), 'xml');
  assert.equal(normalizeCodeLanguage('yml', supported), 'yaml');
  assert.equal(normalizeCodeLanguage('Mermaid', supported), 'mermaid');
  assert.equal(normalizeCodeLanguage('Copy code', supported), '');
});
