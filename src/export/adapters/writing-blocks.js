const WRITING_BLOCK = '[data-oai-writing-block-surface],[data-testid="chatgpt-writing-block"]';

export function preserveWritingBlocks({ clone }) {
  for (const surface of clone.querySelectorAll(WRITING_BLOCK)) {
    const editor = surface.querySelector('[role="textbox"][aria-multiline="true"]');
    if (!editor) continue;
    const block = clone.ownerDocument.createElement('section');
    block.setAttribute('data-export-writing-block', '');
    block.setAttribute('data-export-flow', 'writing');
    // Move the existing snapshot nodes so downstream adapters retain their
    // source mappings. Live editor content wins over cached Markdown metadata.
    block.append(...editor.childNodes);
    surface.replaceWith(block);
  }
}
