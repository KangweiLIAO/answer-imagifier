import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCodeLanguage } from '../src/code-language.js';

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
