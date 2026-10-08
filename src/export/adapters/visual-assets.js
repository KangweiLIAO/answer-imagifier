import { isChromaticColor } from '../../shared/color.js';

export function preserveVisualAssets(clone, sourceByCopy, readStyle = source => getComputedStyle(source)) {
  for (const copy of clone.querySelectorAll('svg')) {
    const source = sourceByCopy.get(copy);
    if (!source || source.parentElement?.closest('svg') || source.closest('.katex,mjx-container,math')) continue;
    // Explicit diagram surfaces and SVGs with text are charts, even as thumbnails.
    if (source.closest('.diagram,[data-code-block-preview-pane],[data-d-component="svg"]') || source.querySelector('text,foreignObject')) continue;
    const rect = source.getBoundingClientRect();
    const viewBox = source.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    const smallViewBox = viewBox?.length === 4 && viewBox[2] > 0 && viewBox[2] <= 48 && viewBox[3] > 0 && viewBox[3] <= 48;
    const explicitIcon = source.matches('[data-d-component="icon"],.icon,[class*="lucide"]');
    if (!explicitIcon && !(smallViewBox && rect.width > 0 && rect.width <= 48 && rect.height > 0 && rect.height <= 48)) continue;
    const style = readStyle(source);
    const font = parseFloat(style.getPropertyValue('font-size')) || 16;
    copy.setAttribute('data-export-icon', '');
    copy.style.width = `${Math.min(2.5, Math.max(.75, rect.width / font))}em`;
    copy.style.height = `${Math.min(2.5, Math.max(.75, rect.height / font))}em`;
    copy.style.display = 'inline-block';
    copy.style.flex = 'none';
    copy.style.margin = '0';
    copy.style.verticalAlign = '-.125em';
    copy.style.maxWidth = 'none';
    const linkIcon = Boolean(source.closest('a'));
    for (const node of [copy, ...copy.querySelectorAll('*')]) {
      if (linkIcon || !isChromaticColor(node.style.getPropertyValue('color'))) node.style.color = 'inherit';
      for (const paint of ['fill', 'stroke']) {
        const color = node.style.getPropertyValue(paint);
        if (/^rgb\(/i.test(color) && (!isChromaticColor(color) || (linkIcon && color === style.getPropertyValue('color')))) node.style.setProperty(paint, 'currentColor');
      }
    }
    // Preserve icon/title rows even when their wrapper has no component marker.
    for (let parent = copy.parentElement; parent && parent !== clone; parent = parent.parentElement) {
      const original = sourceByCopy.get(parent);
      if (!original) continue;
      const layout = readStyle(original);
      if (['flex', 'inline-flex'].includes(layout.getPropertyValue('display')) && layout.getPropertyValue('flex-direction') === 'row') {
        parent.setAttribute('data-export-icon-row', '');
        parent.style.gap = layout.getPropertyValue('gap') || '8px';
        break;
      }
    }
  }
}
