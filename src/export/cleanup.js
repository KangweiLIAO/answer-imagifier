import { element } from '../dom.js';
import { t } from '../i18n.js';

export function cleanInteractiveContent({ clone, warnings }) {
  clone.querySelectorAll('script,style,link,meta').forEach(el => el.remove());
  clone.querySelectorAll('button,input,textarea,select,[role="button"],[hidden],[aria-hidden="true"]:not(.katex-html)').forEach(el => {
    // KaTeX's visual HTML is aria-hidden because its MathML is the accessible equivalent.
    if (!el.closest('[data-math],[data-export-icon]')) el.remove();
  });
  clone.querySelectorAll('iframe,video,audio,object,embed').forEach(el => {
    el.replaceWith(element('p', 'asset-warning', t('embedBlocked')));
    warnings.push(t('embedsReplaced'));
  });
}

export function pruneEmptyWrappers({ clone }) {
  // Remove empty wrappers left by citation pills, without disturbing SVG or formula layout.
  [...clone.querySelectorAll('span,a,p,div')].reverse().forEach(el => {
    if (!el.closest('[data-math],svg,[data-export-form-control]') && !el.hasAttribute('data-export-component') && !el.textContent.trim() && !el.querySelector('img,svg,canvas,math,br,hr,[data-export-component]')) el.remove();
  });
}
