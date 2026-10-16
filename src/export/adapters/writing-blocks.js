import { WRITING_BLOCK_SELECTOR, WRITING_EDITOR_SELECTOR } from '../../chatgpt/selectors.js';

export function preserveWritingBlocks(context) {
  const { clone } = context;
  const surfaces = [...clone.querySelectorAll(WRITING_BLOCK_SELECTOR)];
  if (clone.matches(WRITING_BLOCK_SELECTOR)) surfaces.unshift(clone);
  for (const surface of surfaces) {
    const editor = surface.querySelector(WRITING_EDITOR_SELECTOR);
    if (!editor) continue;
    const block = clone.ownerDocument.createElement('section');
    block.setAttribute('data-export-writing-block', '');
    block.setAttribute('data-export-flow', 'writing');
    // Move the existing snapshot nodes so downstream adapters retain their
    // source mappings. Live editor content wins over cached Markdown metadata.
    block.append(...editor.childNodes);
    if (surface === clone) context.clone = block;
    else surface.replaceWith(block);
  }
}
