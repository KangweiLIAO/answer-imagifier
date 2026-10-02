// One margin per visible block. Neutral single-child host wrappers can otherwise
// leave a zero-margin heading or chart immediately against the following block.
export function preserveBlockSpacing(card) {
  const content = card.querySelector('.answer-content');
  if (!content) return;
  const selector = 'h1,h2,h3,h4,h5,h6,hr,pre,table,blockquote,.diagram,.export-image-frame,[data-export-display-math]';
  for (const block of content.querySelectorAll(selector)) {
    if (/^h[1-6]$/.test(block.localName) && block.parentElement.closest('[data-export-component=row]')) continue;
    if (block.parentElement.closest(`${selector},[data-math],svg`)) continue;
    let outer = block;
    while (outer.parentElement !== content && content.contains(outer.parentElement)) {
      const parent = outer.parentElement;
      if (!parent.matches('div,span') || parent.hasAttribute('data-d-has-border') || parent.children.length !== 1 ||
          [...parent.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) break;
      outer = parent;
    }
    outer.setAttribute('data-export-flow', /^h[1-6]$/.test(block.localName) ? 'heading' : block.localName === 'hr' ? 'divider' : 'block');
  }
}
