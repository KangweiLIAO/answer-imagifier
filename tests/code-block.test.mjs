import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { getCodeBlocks, createCodeBlock } from '../src/code-block.js';
function root(html) { return parseHTML(`<html><body>${html}</body></html>`).document.body; }
function block(language, content) {
  return `<div data-markdown-copy="code-block"><div data-markdown-copy="exclude"><svg></svg><div>${language}</div><button>Copy</button></div><div><div><div><div>${content}</div></div></div></div></div>`;
}
test('deep viewer headers produce language-specific highlighted tokens without toolbar text', () => {
  for (const [label, text, token] of [['JSON','{"name":"LeetWidget","openSource":true}','.hljs-attr'],['Bash','cd project\nnpm install','.hljs-built_in'],['Java','int count = 3;','.hljs-type']]) {
    const source = root(block(label,`<pre><code>${text}</code></pre>`));
    const blocks = getCodeBlocks(source);
    assert.equal(blocks.length,1);
    const result = createCodeBlock(blocks[0]);
    assert.equal(result.querySelector('code').textContent,text);
    assert.ok(result.querySelector(token),label);
    assert.equal(result.querySelector('.code-label').textContent,label.toLowerCase());
    assert.doesNotMatch(result.textContent,/Copy/);
  }
});
test('CodeMirror Python preserves indentation, blank lines, and escaping', () => {
  const source = root(block('Python','<div class="cm-content"><div class="cm-line">def f(n):</div><div class="cm-line">    if n &lt; 1:</div><div class="cm-line">        return n</div><div class="cm-line"><br></div><div class="cm-line">print(f(0))</div></div>'));
  const result = createCodeBlock(getCodeBlocks(source)[0]);
  assert.equal(result.querySelector('code').textContent,'def f(n):\n    if n < 1:\n        return n\n\nprint(f(0))');
  assert.ok(result.querySelector('.hljs-keyword'));
  assert.equal(result.querySelectorAll('script').length,0);
});
test('legacy code, unknown languages, and Mermaid retain their content', () => {
  const source = root('<pre><code class="language-python">return 1</code></pre><pre><code>plain &lt;text&gt;</code></pre><pre><code class="language-mermaid">graph TD\n A--&gt;B</code></pre>');
  const results = getCodeBlocks(source).map(createCodeBlock);
  assert.ok(results[0].querySelector('.hljs-keyword'));
  assert.equal(results[1].querySelector('code').textContent,'plain <text>');
  assert.equal(results[2].querySelector('code').dataset.language,'mermaid');
  assert.equal(results[2].querySelector('code').textContent,'graph TD\n A-->B');
});
