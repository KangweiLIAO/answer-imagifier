import { PLUGIN_NAME, t } from './i18n.js';
import { toCanvas, getFontEmbedCSS } from 'html-to-image';
import mermaid from 'mermaid';
import hljs from 'highlight.js/lib/common';
import { element, getAnswerRoot, getPrompt, exportScale } from './dom.js';
import { excludedContent } from './content-filter.js';
import { roundExport } from './image-style.js';
import { inheritMathForeground } from './math-style.js';
import { detectCodeLanguage } from './code-language.js';
import openaiLogo from './assets/openai-logo.svg';
import pluginLogo from '../public/icons/icon128.png';

let diagramId = 0;
const timeout = (promise, ms, message) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
};

function copyStyles(source, target) {
  const style = getComputedStyle(source);
  for (const key of style) target.style.setProperty(key, style.getPropertyValue(key));
}

function cloneContent(source, warnings) {
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
    const math = original.closest('.katex, mjx-container, math');
    const svg = original.closest('svg');
    // Only math and existing vector charts need the host's layout styles.
    copy.removeAttribute('style');
    if (math || svg) {
      if (copy.style) copyStyles(original, copy);
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
    if (original instanceof HTMLCanvasElement) {
      try { const img = element('img'); img.src = original.toDataURL(); img.alt = t('chart'); copy.replaceWith(img); }
      catch { copy.replaceWith(element('p', 'asset-warning', t('chartBlocked'))); warnings.push(t('chartsBlocked')); }
    }
  });
  clone.querySelectorAll('script,style,link,meta').forEach(el => el.remove());
  clone.querySelectorAll('button,input,textarea,select,[role="button"],[hidden],[aria-hidden="true"]:not(.katex-html)').forEach(el => {
    // KaTeX's visual HTML is aria-hidden because its MathML is the accessible equivalent.
    if (!el.closest('[data-math]')) el.remove();
  });
  clone.querySelectorAll('iframe,video,audio,object,embed').forEach(el => {
    el.replaceWith(element('p', 'asset-warning', t('embedBlocked')));
    warnings.push(t('embedsReplaced'));
  });
  // Replace ChatGPT code toolbars and nested scrolling containers with a plain code block.
  [...clone.querySelectorAll('pre')].forEach(pre => {
    const original = sourceByCopy.get(pre);
    const nativeDiagram = original.querySelector('[data-code-block-preview-pane="mermaid"] img');
    if (nativeDiagram && /^data:image\/svg\+xml[;,]/i.test(nativeDiagram.currentSrc || nativeDiagram.src)) {
      // Native Mermaid previews are SVG images inside a pre, not code. Preserve
      // this chart explicitly, without re-enabling generated-image exports.
      const diagram = element('div', 'diagram native-diagram');
      const img = element('img');
      img.src = nativeDiagram.currentSrc || nativeDiagram.src;
      img.alt = nativeDiagram.getAttribute('aria-label') || t('chart');
      diagram.append(img);
      pre.replaceWith(diagram);
      return;
    }
    const codeSource = original.querySelector('code') || original;
    const language = detectCodeLanguage(original, codeSource, candidate => Boolean(hljs.getLanguage(candidate)));
    pre.replaceChildren();
    if (language) pre.append(element('span', 'code-label', language));
    const code = element('code', '', codeSource.textContent);
    code.dataset.language = language;
    if (language && language !== 'mermaid' && hljs.getLanguage(language)) {
      code.innerHTML = hljs.highlight(codeSource.textContent, { language, ignoreIllegals: true }).value;
    }
    pre.append(code);
  });
  // Remove empty wrappers left by citation pills, without disturbing SVG or formula layout.
  [...clone.querySelectorAll('span,a,p,div')].reverse().forEach(el => {
    if (!el.closest('[data-math],svg') && !el.textContent.trim() && !el.querySelector('img,svg,canvas,math,br,hr')) el.remove();
  });
  return clone;
}

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

export async function createCard(answer, options, mount) {
  const warnings = [];
  const card = element('article', 'ai-card');
  card.dataset.theme = options.theme;
  card.dataset.fontSize = options.fontSize;
  card.dataset.compact = String(options.compact);
  card.style.width = `${options.width}px`;
  const header = element('header', 'card-header');
  const brand = element('span', 'wordmark');
  const logo = element('span', 'brand-logo');
  logo.innerHTML = openaiLogo;
  // The supplied path fits the viewBox; removing redundant clips avoids page-URL
  // fragment references becoming invalid when html-to-image embeds this SVG.
  logo.querySelectorAll('[clip-path]').forEach(el => el.removeAttribute('clip-path'));
  logo.querySelector('defs')?.remove();
  logo.querySelectorAll('path').forEach(path => { path.style.fill = options.theme === 'dark' ? '#f0f0f0' : '#202020'; });
  logo.setAttribute('aria-hidden', 'true');
  brand.append(logo, element('span', '', 'ChatGPT'));
  const credit = element('span', 'credit');
  const pluginMark = element('img', 'plugin-logo');
  pluginMark.src = pluginLogo;
  pluginMark.alt = '';
  pluginMark.setAttribute('aria-hidden', 'true');
  credit.append(element('span', '', `by Chrome extension: ${PLUGIN_NAME}`), pluginMark);
  header.append(brand, credit);
  card.append(header);
  {
    const section = element('section', 'answer');
    const prompt = getPrompt(answer);
    if (options.prompt && prompt) section.append(element('div', 'prompt', prompt));
    const content = cloneContent(getAnswerRoot(answer), warnings);
    content.classList.add('answer-content');
    section.append(content); card.append(section);
  }
  mount.replaceChildren(card);
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
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return { card, warnings: [...new Set(warnings)] };
}

export async function rasterize(card, options) {
  const height = Math.ceil(card.getBoundingClientRect().height);
  const ratio = exportScale(options.width, height, options.scale);
  let fontEmbedCSS = '';
  // Math typesetting may use web fonts that must survive the SVG image boundary.
  if (card.querySelector('[data-math]')) {
    fontEmbedCSS = await timeout(getFontEmbedCSS(card, { preferredFontFormat: 'woff2' }), 15000, t('mathFontTimeout'));
  }
  const canvas = await toCanvas(card, {
    width: options.width, height, pixelRatio: ratio, fontEmbedCSS,
    backgroundColor: options.theme === 'dark' ? '#212121' : '#ffffff',
    skipAutoScale: true,
  });
  roundExport(canvas, options.format, options.theme, ratio);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(t('imageFailed'))), options.format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95));
  return { blob, width: canvas.width, height: canvas.height, reduced: ratio < options.scale - 0.01 };
}
