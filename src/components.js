import { isChromaticColor } from './visual-assets.js';
// Normalize structured answer components before empty-wrapper cleanup. Keep only
// layout values needed by the export; host classes and theme variables stay out.
export function preserveComponents(clone, sourceByCopy, readStyle = source => getComputedStyle(source)) {
  const nodes = [clone, ...clone.querySelectorAll('[data-d-component]')];
  for (const copy of nodes) {
    const type = copy.getAttribute('data-d-component');
    if (!['box', 'row', 'title', 'text', 'caption', 'divider', 'svg', 'list', 'list-item', 'badge', 'form', 'radio-group', 'radio', 'table', 'table-row', 'table-cell', 'grid', 'grid-item', 'pressable'].includes(type)) continue;
    const source = sourceByCopy.get(copy);
    if (!source) continue;
    // Entity names are inline pressable spans, not disposable action buttons.
    if (type === 'pressable') {
      if (!source.hasAttribute('data-d-inline') || source.localName === 'button') continue;
      for (const attribute of ['role', 'tabindex', 'type', 'aria-haspopup', 'aria-expanded']) copy.removeAttribute(attribute);
      copy.setAttribute('data-export-entity', '');
      continue;
    }
    copy.setAttribute('data-export-component', type);
    if (type === 'divider') {
      const hr = clone.ownerDocument.createElement('hr');
      hr.setAttribute('data-export-component', 'divider');
      copy.replaceWith(hr);
      continue;
    }
    if (type === 'table-cell') {
      const width = source.style.getPropertyValue('width');
      if (width && !width.includes('var(')) copy.style.width = width;
    }
    if (type === 'box' || type === 'row' || type === 'form' || type === 'grid' || type === 'grid-item') {
      const style = readStyle(source);
      if (source.hasAttribute('data-d-has-border')) {
        const border = style.getPropertyValue('border-top-color');
        if (isChromaticColor(border)) copy.style.borderColor = border;
      }
      for (const property of ['gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'flex-grow', 'flex-shrink', 'flex-basis']) {
        const value = style.getPropertyValue(property);
        if (value && value !== 'normal' && !value.includes('var(')) copy.style.setProperty(property, property === 'gap' && /^\d+(?:\.\d+)?px$/.test(value) ? `calc(${value} * var(--spacing-scale, 1))` : value);
      }
      if (type === 'grid') {
        for (const property of ['grid-template-columns', 'grid-template-rows', 'grid-auto-flow']) {
          // Computed row tracks are host-page pixel heights. Export width and
          // font settings can make their contents taller; let those rows grow.
          const value = source.style.getPropertyValue(property) || (property === 'grid-template-rows' ? '' : style.getPropertyValue(property));
          if (value && !value.includes('var(')) copy.style.setProperty(property, value);
        }
      }
      if (type === 'grid-item') {
        for (const [property, variable] of [['grid-column', '--grid-item-column'], ['grid-row', '--grid-item-row']]) {
          const value = source.style.getPropertyValue(property) || source.style.getPropertyValue(variable) || style.getPropertyValue(property);
          if (value && !value.includes('var(')) copy.style.setProperty(property, value);
        }
      }
      // Empty flex children can be colored segments with no explicit height.
      const background = source.style.getPropertyValue('background-color');
      if (background && !background.includes('var(')) copy.style.backgroundColor = background;
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

      }
    }
    if (/var\(--color-text-secondary\)/.test(source.getAttribute('style') || '')) {
      copy.setAttribute('data-export-secondary', '');
    }
  }
}
