import { element } from '../dom.js';
import { t } from '../i18n.js';
import { excludedContent } from '../content-filter.js';
import { inheritMathForeground } from '../math-style.js';

function copyStyles(source, target, readStyle) {
  const style = readStyle(source);
  for (const key of style) target.style.setProperty(key, style.getPropertyValue(key));
}

export function createSnapshot(source, warnings, options, readStyle = source => getComputedStyle(source)) {
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  const omitted = excludedContent(source);
  const sourceByCopy = new Map(copies.map((copy, index) => [copy, originals[index]]));
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!(copy instanceof Element)) return;
    if (omitted.has(original)) { copy.remove(); return; }
    if (copy !== clone && !clone.contains(copy)) return;
    if (original.matches('.katex-display,mjx-container[display="true"],math[display="block"]')) copy.setAttribute('data-export-display-math', '');
    const math = original.closest('.katex, mjx-container, math');
    const svg = original.closest('svg');
    // Only math and existing vector charts need the host's layout styles.
    copy.removeAttribute('style');
    if (math || svg) {
      if (copy.style) copyStyles(original, copy, readStyle);
      if (math) {
        copy.setAttribute('data-math', '');
        inheritMathForeground(copy);
      }
    }
    if (!math && !svg) copy.removeAttribute('class');
    for (const attr of [...copy.attributes]) {
      if (/^on/i.test(attr.name) || ['srcdoc', 'autofocus', 'contenteditable'].includes(attr.name)) copy.removeAttribute(attr.name);
      if (['href','src','xlink:href'].includes(attr.name) && /^\s*javascript:/i.test(attr.value)) copy.removeAttribute(attr.name);
    }
    if (original instanceof HTMLImageElement) {
      copy.src = original.currentSrc || original.src;
      copy.removeAttribute('srcset'); copy.removeAttribute('loading');
    }
    if (original instanceof HTMLImageElement || (original.localName === 'svg' && !original.parentElement?.closest('svg'))) {
      copy.setAttribute('data-export-source-width', String(original.getBoundingClientRect().width));
    }
    if (original instanceof HTMLCanvasElement) {
      try { const img = element('img'); img.src = original.toDataURL(); img.alt = t('chart'); img.setAttribute('data-export-source-width', String(original.getBoundingClientRect().width)); copy.replaceWith(img); }
      catch { copy.replaceWith(element('p', 'asset-warning', t('chartBlocked'))); warnings.push(t('chartsBlocked')); }
    }
  });
  return { clone, sourceByCopy, omitted, warnings, options, readStyle };
}
