import mermaid from 'mermaid';
import { element } from '../dom.js';
import { t } from '../i18n.js';
import { timeout } from '../shared/timeout.js';
import { loadImageData } from '../shared/network-image.js';

let diagramId = 0;

export async function prepareImages(card, warnings, options = {}) {
  await Promise.all([...card.querySelectorAll('img')].map(async img => {
    try {
      // Inline each asset before rasterization. CORS failures are explicit, never silent blanks.
      if (!img.src.startsWith('data:')) {
        img.src = await loadImageData(img.src);
      }
      await timeout(img.decode(), 12000, t('imageTimeout'));
      if (img.naturalWidth * img.naturalHeight > 16_000_000) throw new Error('Image dimensions too large');
    } catch {
      if (img.hasAttribute('data-export-network-image')) {
        const frame = img.closest('[data-export-network-image-frame]');
        if (options.showImages === false) {
          const target = frame.parentElement.children.length === 1 ? frame.parentElement : frame;
          target.remove();
        } else {
          const placeholder = element('div', '', t('imagePlaceholder'));
          placeholder.setAttribute('data-export-image-placeholder', '');
          placeholder.style.cssText = 'width:100%;height:100%;aspect-ratio:inherit';
          img.replaceWith(placeholder);
        }
      } else img.replaceWith(element('p', 'asset-warning', img.alt ? t('imageUnavailableAlt', { alt: img.alt }) : t('imageUnavailable')));
      warnings.push(t('imagesFailed'));
    }
  }));
}

export async function prepareResources(card, options, warnings) {
  await timeout(document.fonts.ready, 12000, t('fontsLoading'));
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: options.theme === 'dark' ? 'dark' : 'neutral', flowchart: { htmlLabels: false }, suppressErrorRendering: true });
  for (const code of card.querySelectorAll('code[data-language="mermaid"]')) {
    try {
      const { svg } = await mermaid.render(`ai-diagram-${++diagramId}`, code.textContent);
      const diagram = element('div', 'diagram');
      // Mermaid sanitizes input in strict mode; parsed SVG is generated locally.
      diagram.innerHTML = svg;
      code.closest('pre').replaceWith(diagram);
    } catch {
      warnings.push(t('mermaidFailed'));
    }
  }
  await prepareImages(card, warnings, options);
}
