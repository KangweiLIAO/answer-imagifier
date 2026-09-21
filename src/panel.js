import { PLUGIN_NAME, t, locale } from './i18n.js';
import panelCSS from './panel.css';
import cardCSS from './card.css';
import { element, getAnswers, fileName, isStreaming } from './dom.js';
import { createCard, rasterize } from './render.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js';
import { CORNER_RADIUS } from './image-style.js';

export const exportIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5m-2 4 2 2 3-4"/></svg>';
const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>';
let active = false;
export function openPanel(preselected) {
  if (active) return;
  active = true;
  const answers = getAnswers();
  const answer = preselected && answers.includes(preselected) ? preselected : answers.at(-1);
  const options = { ...DEFAULT_SETTINGS };
  const defaultFileName = document.title.trim().replace(/\s+[-–—|]\s+ChatGPT$/i, '').trim();
  const host = element('div'); host.id = 'answer-imagifier-root'; host.lang = locale === 'zh' ? 'zh-CN' : 'en';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = element('style'); style.textContent = panelCSS + cardCSS; shadow.append(style);
  const dialog = element('dialog');
  dialog.setAttribute('aria-labelledby', 'ai-title');
  dialog.innerHTML = `<div class="shell">
    <header class="topbar"><div class="identity"><span class="app-mark">${exportIcon}</span><div><h1 class="heading" id="ai-title">${t('exportImage')}</h1><p class="subheading">${PLUGIN_NAME.toUpperCase()}</p></div></div><button class="close" aria-label="${t('close')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div class="body"><aside class="sidebar">
      <div class="field"><span class="field-label" id="theme-label">${t('imageStyle')}</span><div class="segments" data-option="theme" role="group" aria-labelledby="theme-label"><button data-value="light" aria-pressed="true">${t('light')}</button><button data-value="dark" aria-pressed="false">${t('dark')}</button></div></div>
      <div class="field"><span class="field-label" id="format-label">${t('format')}</span><div class="segments" data-option="format" role="group" aria-labelledby="format-label"><button data-value="png" aria-pressed="true">PNG</button><button data-value="jpg" aria-pressed="false">JPG</button></div></div>
      <div class="field"><label for="width">${t('width')}</label><select id="width"><option value="600">${t('compact')} · 600 px</option><option value="760" selected>${t('standard')} · 760 px</option><option value="960">${t('wide')} · 960 px</option></select></div>
      <div class="field"><label for="scale">${t('quality')}</label><select id="scale"><option value="1">${t('standard')} · 1×</option><option value="2" selected>${t('high')} · 2×</option><option value="3">${t('ultra')} · 3×</option></select></div>
      <div class="field"><span class="field-label" id="font-size-label">${t('fontSize')}</span><div class="segments" data-option="fontSize" role="group" aria-labelledby="font-size-label"><button data-value="small" aria-pressed="false">${t('small')}</button><button data-value="standard" aria-pressed="true">${t('standard')}</button><button data-value="large" aria-pressed="false">${t('large')}</button></div></div>
      <label class="switch-row" for="prompt">${t('includePrompt')}<input type="checkbox" id="prompt" role="switch"></label>
      <label class="switch-row" for="compact">${t('compactLayout')}<input type="checkbox" id="compact" role="switch"></label>
      <div class="field filename-field"><label for="filename">${t('fileName')}</label><input type="text" id="filename" maxlength="120" autocomplete="off" spellcheck="false"></div>
      <div class="local-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>${t('localOnly')}</span></div>
    </aside><main class="workspace"><div class="preview-bar"><span class="preview-label"><span class="dot"></span>${t('preview')}</span><span class="dimensions">${t('preparing')}</span></div><div class="preview-scroll"><div class="placeholder"><span class="loader"></span>${t('layingOut')}</div><img class="preview-image hidden" alt="${t('previewAlt')}"></div><footer class="bottom-bar"><div class="status" role="status" aria-live="polite"></div><button class="action copy" disabled><span>${t('copy')}</span></button><button class="action primary save" disabled>${downloadIcon}<span>${t('save', { format: 'PNG' })}</span></button></footer></main></div></div>`;
  const mount = element('div', 'render-mount'); mount.setAttribute('aria-hidden', 'true');
  shadow.append(dialog, mount); document.body.append(host);
  const $ = selector => shadow.querySelector(selector);
  $('#filename').value = defaultFileName;
  const previewFrame = element('div', 'preview-frame');
  $('.preview-image').before(previewFrame);
  previewFrame.append($('.preview-image'));
  const retry = element('button', 'action hidden', t('retry'));
  $('.bottom-bar').insertBefore(retry, $('.copy'));
  retry.addEventListener('click', () => schedule());
  let revision = 0, running = false, timer, result = null, url = null, closed = false;
  const returnFocus = document.activeElement;
  function status(message, kind = '') { $('.status').textContent = message; $('.status').className = `status ${kind}`; }
  function schedule() {
    revision++; result = null;
    retry.classList.add('hidden');
    $('.copy').classList.remove('copied');
    $('.copy span').textContent = t('copy');
    $('.save').disabled = $('.copy').disabled = true;
    $('.save span').textContent = t('save', { format: options.format.toUpperCase() });
    $('.preview-image').classList.add('hidden'); $('.placeholder').classList.remove('hidden');
    $('.placeholder').textContent = answer ? t('renderingContent') : t('noAnswer');
    $('.dimensions').textContent = answer ? t('generating') : t('empty');
    status(answer ? t('generatingPreview') : t('openFromAnswer'));
    clearTimeout(timer); timer = setTimeout(render, 180);
  }
  async function render() {
    if (running || closed || !answer) return;
    running = true;
    const version = revision;
    const snapshot = { ...options };
    try {
      if (!answer.isConnected) throw new Error(t('conversationChanged'));
      if (isStreaming()) throw new Error(t('streaming'));
      const { card, warnings } = await createCard(answer, snapshot, mount);
      const rendered = await rasterize(card, snapshot);
      if (closed || version !== revision) return;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(rendered.blob);
      $('.preview-image').src = url;
      await $('.preview-image').decode();
      if (closed || version !== revision) return;
      result = { ...rendered, format: snapshot.format };
      previewFrame.style.setProperty('--preview-radius', `${CORNER_RADIUS / snapshot.width * 100}cqw`);
      $('.preview-image').classList.remove('hidden'); $('.placeholder').classList.add('hidden');
      $('.preview-scroll').scrollTop = 0;
      $('.dimensions').textContent = `${rendered.width} × ${rendered.height} px · ${(rendered.blob.size / 1024 / 1024).toFixed(1)} MB`;
      if (rendered.reduced) warnings.push(t('reduced'));
      status(warnings.length ? warnings.join(' ') : t('ready'));
      $('.save').disabled = false;
      $('.copy').disabled = !navigator.clipboard?.write || !globalThis.ClipboardItem;
    } catch (error) {
      if (version === revision && !closed) {
        $('.placeholder').textContent = t('previewFailed');
        $('.dimensions').textContent = t('failed');
        status(error.message || t('renderError'), 'error');
        retry.classList.remove('hidden');
      }
    } finally {
      running = false;
      if (!closed && version !== revision) render();
    }
  }
  shadow.querySelectorAll('.segments button').forEach(button => button.addEventListener('click', () => {
    const group = button.parentElement;
    options[group.dataset.option] = button.dataset.value;
    group.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    saveSettings(options);
    schedule();
  }));
  for (const name of ['width', 'scale', 'prompt', 'compact']) $(`#${name}`).addEventListener('change', event => {
    options[name] = ['prompt', 'compact'].includes(name) ? event.target.checked : Number(event.target.value); saveSettings(options); schedule();
  });
  $('.save').addEventListener('click', () => {
    if (!result) return;
    const anchor = element('a'); anchor.href = url; anchor.download = fileName($('#filename').value || defaultFileName, result.format);
    shadow.append(anchor); anchor.click(); anchor.remove(); status(t('downloadStarted'), 'success');
  });
  $('.copy').addEventListener('click', async () => {
    if (!result) return;
    const current = result;
    try {
      // Clipboard images use PNG even when the selected download format is JPG.
      const png = current.format === 'png' ? Promise.resolve(current.blob) : createImageBitmap(current.blob).then(bitmap => {
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
        return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(t('conversionFailed')))));
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      if (!closed) {
        $('.copy').classList.add('copied');
        $('.copy span').textContent = `✓ ${t('copiedAction')}`;
        status(t('copied'), 'success');
      }
    } catch {
      if (!closed) {
        $('.copy').classList.remove('copied');
        $('.copy span').textContent = t('copy');
        status(t('copyDenied'), 'error');
      }
    }
  });
  function close() {
    if (closed) return;
    closed = true; clearTimeout(timer); if (url) URL.revokeObjectURL(url);
    dialog.close(); host.remove(); active = false; returnFocus?.focus();
  }
  $('.close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
  const controls = [...shadow.querySelectorAll('.sidebar button,.sidebar select,.sidebar input')];
  controls.forEach(control => { control.disabled = true; });
  dialog.showModal();
  loadSettings().then(saved => {
    if (closed) return;
    Object.assign(options, saved);
    shadow.querySelectorAll('.segments').forEach(group => {
      group.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.value === options[group.dataset.option]));
      });
    });
    for (const name of ['width', 'scale']) $(`#${name}`).value = String(options[name]);
    for (const name of ['prompt', 'compact']) $(`#${name}`).checked = options[name];
    controls.forEach(control => { control.disabled = false; });
    schedule();
  });
}
