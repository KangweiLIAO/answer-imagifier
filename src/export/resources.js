import mermaid from 'mermaid';
import { element } from '../dom.js';
import { t } from '../i18n.js';
import { timeout } from '../shared/timeout.js';

let diagramId = 0;

async function prepareImages(card, warnings) {
  await Promise.all([...card.querySelectorAll('img')].map(async img => {
    try {
      // Inline each asset before rasterization. CORS failures are explicit, never silent blanks.
      if (!img.src.startsWith('data:')) {
        const response = await fetch(img.src, { signal: AbortSignal.timeout(12000), credentials: 'same-origin' });
        if (!response.ok) throw new Error('Image request failed');
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Not an image');
        img.src = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
        });
      }
      await timeout(img.decode(), 12000, t('imageTimeout'));
    } catch {
      img.replaceWith(element('p', 'asset-warning', img.alt ? t('imageUnavailableAlt', { alt: img.alt }) : t('imageUnavailable')));
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
  await prepareImages(card, warnings);
}
