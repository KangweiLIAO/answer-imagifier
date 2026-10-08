// Replace omitted structured images and their loading UI with a fluid, inert
// placeholder. Read authored proportions, never a measured host-page height.
export function preserveImagePlaceholders(clone, sourceByCopy, omitted, label, enabled = true) {
  for (const copy of clone.querySelectorAll('[data-d-component="image"]')) {
    const source = sourceByCopy.get(copy);
    const images = [...source.querySelectorAll('img,picture')];
    if (!images.length || !images.every(image => omitted.has(image))) continue;
    const parent = source.parentElement;
    const imageOnly = parent?.matches('[data-d-component="box"]') &&
      parent.children.length === 1 &&
      ![...parent.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
    const frame = imageOnly ? parent : source;
    const target = imageOnly ? copy.parentElement : copy;
    if (!enabled) { target.remove(); continue; }
    const placeholder = clone.ownerDocument.createElement('div');
    placeholder.setAttribute('data-export-image-placeholder', '');
    placeholder.textContent = label;
    const ratio = frame.style.getPropertyValue('aspect-ratio') || source.style.getPropertyValue('aspect-ratio');
    if (/^\s*\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*$/.test(ratio)) placeholder.style.aspectRatio = ratio;
    for (const property of ['width', 'max-width']) {
      const value = frame.style.getPropertyValue(property);
      if (/^\d+(?:\.\d+)?(?:px|%|rem|em)$/.test(value)) placeholder.style.setProperty(property, value);
    }
    target.replaceWith(placeholder);
  }
}
