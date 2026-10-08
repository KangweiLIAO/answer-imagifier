import { element } from '../../dom.js';
import { t } from '../../i18n.js';
import { getCodeBlocks, createCodeBlock } from '../../code-block.js';

export function preserveCode({ clone, sourceByCopy }) {
  // Replace ChatGPT code toolbars and nested scrolling containers with a plain code block.
  getCodeBlocks(clone).forEach(pre => {
    const original = sourceByCopy.get(pre);
    const nativeDiagram = original.querySelector('[data-code-block-preview-pane="mermaid"] img');
    if (nativeDiagram && /^data:image\/svg\+xml[;,]/i.test(nativeDiagram.currentSrc || nativeDiagram.src)) {
      // Native Mermaid previews are SVG images inside a pre, not code. Preserve
      // this chart explicitly, without re-enabling generated-image exports.
      const diagram = element('div', 'diagram native-diagram');
      const img = element('img');
      img.src = nativeDiagram.currentSrc || nativeDiagram.src;
      img.alt = nativeDiagram.getAttribute('aria-label') || t('chart');
      img.setAttribute('data-export-source-width', String(nativeDiagram.getBoundingClientRect().width));
      diagram.append(img);
      pre.replaceWith(diagram);
      return;
    }
    pre.replaceWith(createCodeBlock(original));
  });
}
