import { isChromaticColor } from './visual-assets.js';
// Normalize structured answer components before empty-wrapper cleanup. Keep only
// layout values needed by the export; host classes and theme variables stay out.
export function preserveComponents(clone, sourceByCopy, readStyle = source => getComputedStyle(source)) {
  const nodes = [clone, ...clone.querySelectorAll('[data-d-component]')];
  for (const copy of nodes) {
    const type = copy.getAttribute('data-d-component');
    if (!['box', 'row', 'title', 'text', 'caption', 'divider', 'svg', 'list', 'list-item', 'badge', 'form', 'radio-group', 'radio'].includes(type)) continue;
    const source = sourceByCopy.get(copy);
    if (!source) continue;
    copy.setAttribute('data-export-component', type);
    if (type === 'divider') {
      const hr = clone.ownerDocument.createElement('hr');
      hr.setAttribute('data-export-component', 'divider');
      copy.replaceWith(hr);
      continue;
    }
    if (type === 'box' || type === 'row' || type === 'form') {
      const style = readStyle(source);
      if (source.hasAttribute('data-d-has-border')) {
        const border = style.getPropertyValue('border-top-color');
        if (isChromaticColor(border)) copy.style.borderColor = border;
      }
      for (const property of ['gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'flex-grow', 'flex-shrink', 'flex-basis']) {
        const value = style.getPropertyValue(property);
        if (value && value !== 'normal' && !value.includes('var(')) copy.style.setProperty(property, property === 'gap' && /^\d+(?:\.\d+)?px$/.test(value) ? `calc(${value} * var(--spacing-scale, 1))` : value);
      }
      // Fixed-height boxes in these components include empty progress tracks
      // and fills. Preserve dimensions, including a meaningful width of 0%.
      if (source.hasAttribute('data-d-has-height')) {
        copy.setAttribute('data-export-shape', '');
        for (const property of ['height', 'border-radius']) {
          const value = style.getPropertyValue(property);
          if (value && !value.includes('var(')) copy.style.setProperty(property, value);
        }
        if (source.hasAttribute('data-d-has-width')) {
          const width = source.style.getPropertyValue('width') || style.getPropertyValue('width');
          if (width && !width.includes('var(')) copy.style.width = width;
        }
        // Theme-dependent surfaces use our palette; literal accent colors survive.
        const background = source.style.getPropertyValue('background-color');
        if (background && !background.includes('var(')) copy.style.backgroundColor = background;
      }
    }
    if (/var\(--color-text-secondary\)/.test(source.getAttribute('style') || '')) {
      copy.setAttribute('data-export-secondary', '');
    }
  }
}
