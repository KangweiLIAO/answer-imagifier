import { t, locale } from './i18n.js';
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
