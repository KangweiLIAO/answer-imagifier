import hljs from 'highlight.js/lib/common';
import { detectCodeLanguage } from './code-language.js';

export const CODE_BLOCK_SELECTOR = '[data-markdown-copy="code-block"],pre';
export function getCodeBlocks(root) {
  const blocks = [...root.querySelectorAll(CODE_BLOCK_SELECTOR)];
  return blocks.filter(block => !blocks.some(other => other !== block && other.contains(block)));
}
export function createCodeBlock(original) {
  const editor = original.querySelector('.cm-content');
  const codeSource = editor || original.querySelector('pre code,code,pre') || original;
  // CodeMirror lines are sibling divs: textContent alone loses all newlines.
  const text = editor
    ? [...editor.querySelectorAll('.cm-line')].map(line => line.textContent).join('\n')
    : codeSource.textContent;
  const language = detectCodeLanguage(original, codeSource, candidate => Boolean(hljs.getLanguage(candidate)));
  const pre = original.ownerDocument.createElement('pre');
  if (language) {
    const label = original.ownerDocument.createElement('span');
    label.className = 'code-label'; label.textContent = language; pre.append(label);
  }
  const code = original.ownerDocument.createElement('code');
  code.dataset.language = language;
  code.textContent = text;
  if (language && language !== 'mermaid' && hljs.getLanguage(language)) {
    code.innerHTML = hljs.highlight(text, { language, ignoreIllegals: true }).value;
  }
  pre.append(code);
  return pre;
}
