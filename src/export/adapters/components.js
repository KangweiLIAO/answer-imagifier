import { isChromaticColor } from '../../shared/color.js';

function hasMediaContainer(source) {
  for (let parent = source.parentElement; parent; parent = parent.parentElement) {
    // Stop at content-bearing layouts; clipping a whole answer/card does not
    // make every diagram inside it a thumbnail. Neutral wrappers are allowed.
    if (parent.children.length !== 1 || [...parent.childNodes].some(node => node.nodeType === 3 && /\S/.test(node.textContent))) return false;
    if (parent.matches('[data-d-component="box"][data-d-clip="true"]')) return true;
  }
  return false;
}
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
    // A clipped media container owns its thumbnail geometry. Such a surface
    // participates in the card layout rather than independent diagram sizing.
    if (type === 'svg' && copy.matches('img,svg') && hasMediaContainer(source)) {
      copy.setAttribute('data-export-media', '');
      for (const property of ['width', 'max-width', 'aspect-ratio']) {
        const value = source.style.getPropertyValue(property);
        if (value && !value.includes('var(')) copy.style.setProperty(property, value);
      }
    }
    // Keep authored sizing separate from widths that html-to-image measures.
    // This includes intrinsic inline groups, not only fixed-width boxes.
    if (source.hasAttribute('data-d-has-width') || type === 'table-cell') {
      const width = source.style.getPropertyValue('width');
      if (width && !width.includes('var(')) {
        copy.style.width = width;
        copy.setAttribute('data-export-width', width);
      }
    }
    // Independent prose uses the shared block spacing. Text inside a card,
    // list or table belongs to that component's internal layout instead.
    if (type === 'text' && copy.localName === 'p' && source.hasAttribute('data-d-text-flow')) {
      let nested = false;
      for (let parent = copy.parentElement; parent && parent !== clone; parent = parent.parentElement) {
        if (parent.matches('li,td,th,blockquote,form,[data-d-component="box"],[data-d-component="row"],[data-d-component="grid"],[data-d-component="list"],[data-d-component="list-item"]')) {
          nested = true;
          break;
        }
      }
      if (!nested) copy.setAttribute('data-export-flow', 'paragraph');
    }
    if (type === 'divider') {
      const hr = clone.ownerDocument.createElement('hr');
      hr.setAttribute('data-export-component', 'divider');
      copy.replaceWith(hr);
      continue;
    }
    if (type === 'box' || type === 'row' || type === 'form' || type === 'grid' || type === 'grid-item') {
      const style = readStyle(source);
      if (source.getAttribute('data-d-clip') === 'true') {
        const overflow = style.getPropertyValue('overflow');
        copy.style.overflow = overflow || 'hidden';
        const radius = style.getPropertyValue('border-radius');
        if (radius && !radius.includes('var(')) copy.style.borderRadius = radius;
      }
      if (source.hasAttribute('data-d-has-border')) {
        const border = style.getPropertyValue('border-top-color');
        if (isChromaticColor(border)) copy.style.borderColor = border;
      }
      for (const property of ['gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-self', 'justify-self']) {
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
      else if (background) {
        const resolved = style.getPropertyValue('background-color');
        if (isChromaticColor(resolved)) copy.style.backgroundColor = resolved;
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
          // Neutral progress fills must contrast with their track in either
          // export theme; host foreground variables cannot survive cloning.
          if (source.parentElement?.hasAttribute('data-d-has-height') &&
              background && !copy.style.backgroundColor) copy.setAttribute('data-export-progress-fill', '');
        }

      }
    }
    if (['text', 'title', 'caption'].includes(type)) {
      const alignment = readStyle(source).getPropertyValue('text-align');
      if (alignment && !alignment.includes('var(')) copy.style.textAlign = alignment;
    }
    if (/var\(--color-text-secondary\)/.test(source.getAttribute('style') || '')) {
      copy.setAttribute('data-export-secondary', '');
    }
  }
}
