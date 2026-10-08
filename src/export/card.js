import { PLUGIN_NAME } from '../i18n.js';
import { element } from '../dom.js';
import { baseFontSize } from '../layout.js';
import openaiLogo from '../assets/openai-logo.svg';
import pluginLogo from '../../public/icons/icon128.png';

export function assembleCard(content, prompt, options) {
  const card = element('article', 'ai-card');
  card.dataset.theme = options.theme;
  card.dataset.fontSize = options.fontSize;
  card.dataset.spacing = ['small', 'large'].includes(options.spacing) ? options.spacing : 'standard';
  card.style.width = `${options.widthMode === 'auto' ? 760 : options.width}px`;
  card.style.setProperty('--body-font-size', `${baseFontSize(options)}px`);
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
  header.append(brand);
  if (options.showCredit !== false) {
    const credit = element('span', 'credit');
    const pluginMark = element('img', 'plugin-logo');
    pluginMark.src = pluginLogo;
    pluginMark.alt = '';
    pluginMark.setAttribute('aria-hidden', 'true');
    credit.append(element('span', '', `by Chrome extension: ${PLUGIN_NAME}`), pluginMark);
    header.append(credit);
  }
  card.append(header);
  {
    const section = element('section', 'answer');
    if (options.prompt && prompt) section.append(element('div', 'prompt', prompt));
    content.classList.add('answer-content');
    section.append(content); card.append(section);
  }
  return card;
}
