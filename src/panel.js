import { PLUGIN_NAME, t, locale } from './i18n.js';
import panelCSS from './panel.css';
import infoIcon from './assets/info.svg';
import cardCSS from './card.css';
import { element, getAnswers, fileName, isStreaming } from './dom.js';
import { createCard, rasterize } from './render.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js';
import { validLayout, inRange, WIDTH_LIMITS, FONT_LIMITS } from './layout.js';
import { CORNER_RADIUS } from './image-style.js';

export const exportIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>';
function settingHeading(key, id, control) {
  const title = control
    ? `<label for="${control}">${t(key)}</label>`
    : `<span id="${id}">${t(key)}</span>`;
  return `<div class="field-heading">${title}<span class="setting-help"><button type="button" class="info-button" aria-label="${t('settingHelp', { setting: t(key) })}" aria-describedby="${id}-help">${infoIcon}</button><span class="setting-tooltip" id="${id}-help" role="tooltip">${t(`${key}Help`)}</span></span></div>`;
}
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
      <div class="field filename-field"><label for="filename">${t('fileName')}</label><input type="text" id="filename" maxlength="120" autocomplete="off" spellcheck="false"></div>
      <div class="field"><span class="field-label" id="theme-label">${t('imageStyle')}</span><div class="segments" data-option="theme" role="group" aria-labelledby="theme-label"><button data-value="light" aria-pressed="true">${t('light')}</button><button data-value="dark" aria-pressed="false">${t('dark')}</button></div></div>
      <div class="field"><span class="field-label" id="format-label">${t('format')}</span><div class="segments" data-option="format" role="group" aria-labelledby="format-label"><button data-value="png" aria-pressed="true">PNG</button><button data-value="jpg" aria-pressed="false">JPG</button></div></div>
      <div class="field">${settingHeading('width', 'width-label', 'widthMode')}<select id="widthMode"><option value="auto">${t('automatic')}</option><option value="custom">${t('customWidth')}</option></select><input class="hidden" id="width" type="number" min="600" max="1600" step="1" required aria-label="${t('cardWidthPixels')}" aria-describedby="width-error output-width-note"><span class="field-error hidden" id="width-error" role="alert">${t('widthRange')}</span><p class="output-width-note" id="output-width-note" aria-live="polite"></p><p class="layout-note hidden" role="status"></p></div>
      <div class="field">${settingHeading('quality', 'quality-label', 'scale')}<select id="scale"><option value="1">${t('standard')} · 1×</option><option value="2" selected>${t('high')} · 2×</option><option value="3">${t('ultra')} · 3×</option></select></div>
      <div class="field font-size-field"><span class="field-label" id="font-size-label">${t('fontSize')}</span><div class="segments" data-option="fontSize" role="group" aria-labelledby="font-size-label"><button data-value="small" aria-pressed="false">${t('small')}</button><button data-value="standard" aria-pressed="true">${t('standard')}</button><button data-value="large" aria-pressed="false">${t('large')}</button><button data-value="custom" aria-pressed="false">${t('custom')}</button></div><input class="hidden" id="customFontSize" type="number" min="12" max="24" step="1" required aria-label="${t('fontSizePixels')}" aria-describedby="font-error"><span class="field-error hidden" id="font-error" role="alert">${t('fontRange')}</span></div>
      <div class="field diagram-size-field">${settingHeading('diagramSize', 'diagram-size-label')}<div class="segments" data-option="diagramSize" role="group" aria-labelledby="diagram-size-label"><button data-value="small" aria-pressed="false">${t('small')}</button><button data-value="standard" aria-pressed="true">${t('standard')}</button><button data-value="large" aria-pressed="false">${t('large')}</button></div></div>
      <div class="field spacing-field">${settingHeading('spacing', 'spacing-label')}<div class="segments" data-option="spacing" role="group" aria-labelledby="spacing-label"><button data-value="small" aria-pressed="false">${t('small')}</button><button data-value="standard" aria-pressed="true">${t('standard')}</button><button data-value="large" aria-pressed="false">${t('large')}</button></div></div>
      <label class="switch-row" for="autoRender">${t('autoRenderOnEntry')}<input type="checkbox" id="autoRender" role="switch"></label>
      <label class="switch-row" for="prompt">${t('includePrompt')}<input type="checkbox" id="prompt" role="switch"></label>
      <label class="switch-row" for="showImagePlaceholders">${t('showImagePlaceholders')}<input type="checkbox" id="showImagePlaceholders" role="switch" checked></label>
      <label class="switch-row" for="showCredit">${t('showExtensionCredit')}<input type="checkbox" id="showCredit" role="switch" checked></label>
      <div class="local-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>${t('localOnly')}</span></div>
    </aside><main class="workspace"><div class="preview-bar"><span class="preview-label"><span class="dot"></span>${t('preview')}</span><span class="dimensions">${t('preparing')}</span></div><div class="preview-scroll"><div class="placeholder hidden"></div><img class="preview-image hidden" alt="${t('previewAlt')}"></div><div class="render-overlay"><button class="action primary rerender" disabled>${t('startRender')}</button></div><footer class="bottom-bar"><div class="status" role="status" aria-live="polite"></div><button class="action copy" disabled><span>${t('copy')}</span></button><button class="action primary save" disabled>${downloadIcon}<span>${t('save', { format: 'PNG' })}</span></button></footer></main></div></div>`;
  const mount = element('div', 'render-mount'); mount.setAttribute('aria-hidden', 'true');
  shadow.append(dialog, mount); document.body.append(host);
  const $ = selector => shadow.querySelector(selector);
  $('#filename').value = defaultFileName;
  const previewFrame = element('div', 'preview-frame');
  $('.preview-image').before(previewFrame);
  previewFrame.append($('.preview-image'));
  let revision = 0, running = false, timer, result = null, url = null, closed = false, hasPreview = false, renderRequested = false, settingsReady = false;
  const returnFocus = document.activeElement;
  function status(message, kind = '') { $('.status').textContent = message; $('.status').className = `status ${kind}`; }
  function syncLayoutControls() {
    $('#width').classList.toggle('hidden', options.widthMode !== 'custom');
    $('#customFontSize').classList.toggle('hidden', options.fontSize !== 'custom');
    const widthInvalid = options.widthMode === 'custom' && !inRange(options.width, WIDTH_LIMITS);
    const fontInvalid = options.fontSize === 'custom' && !inRange(options.customFontSize, FONT_LIMITS);
    $('#output-width-note').textContent = widthInvalid ? '' : options.widthMode === 'custom'
      ? t('outputWidthEstimate', { width: options.width * options.scale, layout: options.width, scale: `${options.scale}×` })
      : '';
    $('#width-error').classList.toggle('hidden', !widthInvalid);
    $('#font-error').classList.toggle('hidden', !fontInvalid);
    $('#width').setAttribute('aria-invalid', String(widthInvalid));
    $('#customFontSize').setAttribute('aria-invalid', String(fontInvalid));
  }
  function updateRerender() {
    const busy = running || renderRequested;
    $('.rerender').disabled = busy || !settingsReady || !answer || !validLayout(options);
    $('.rerender').textContent = busy ? t('generating') : hasPreview ? t('rerender') : t('startRender');
    $('.workspace').setAttribute('aria-busy', String(busy));
  }
  function settingsChanged() {
    revision++; result = null; renderRequested = false;
    clearTimeout(timer);
    syncLayoutControls();
    $('.preview-scroll').classList.toggle('is-stale', hasPreview);
    $('.render-overlay').classList.remove('hidden');
    $('.save').disabled = $('.copy').disabled = true;
    $('.copy').classList.remove('copied');
    $('.copy span').textContent = t('copy');
    $('.save span').textContent = t('save', { format: options.format.toUpperCase() });
    if (!hasPreview) {
      $('.placeholder').classList.add('hidden');
      $('.dimensions').textContent = t('notRendered');
    }
    status(!answer ? t('openFromAnswer') : validLayout(options) ? t(hasPreview ? 'previewOutdated' : 'readyToRender') : t('invalidLayout'), validLayout(options) ? '' : 'error');
    updateRerender();
  }
  $('.rerender').addEventListener('click', () => schedule());
  function schedule() {
    revision++; result = null; renderRequested = true;
    syncLayoutControls();
    $('.copy').classList.remove('copied');
    $('.copy span').textContent = t('copy');
    $('.save').disabled = $('.copy').disabled = true;
    $('.save span').textContent = t('save', { format: options.format.toUpperCase() });
    if (hasPreview) {
      $('.preview-scroll').classList.add('is-stale');
      $('.render-overlay').classList.remove('hidden');
    } else {
      $('.preview-image').classList.add('hidden'); $('.placeholder').classList.add('hidden');
    }
    $('.placeholder').textContent = answer ? t('renderingContent') : t('noAnswer');
    $('.dimensions').textContent = answer ? t('generating') : t('empty');
    status(answer ? t('generatingPreview') : t('openFromAnswer'));
    clearTimeout(timer);
    if (!validLayout(options)) { renderRequested = false; updateRerender(); status(t('invalidLayout'), 'error'); $('.placeholder').textContent = t('invalidLayout'); return; }
    updateRerender();
    timer = setTimeout(render, 180);
  }
  async function render() {
    if (running || closed || !answer || !validLayout(options)) return;
    running = true; renderRequested = false;
    updateRerender();
    const version = revision;
    const snapshot = { ...options };
    try {
      // The first frame presents the busy state; start DOM cloning only after
      // the browser has had an intervening opportunity to paint it.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (closed || version !== revision) return;
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
      hasPreview = true;
      $('.preview-scroll').classList.remove('is-stale');
      $('.render-overlay').classList.add('hidden');
      previewFrame.style.setProperty('--preview-radius', `${CORNER_RADIUS / rendered.layoutWidth * 100}cqw`);
      $('.preview-image').classList.remove('hidden'); $('.placeholder').classList.add('hidden');
      $('.preview-scroll').scrollTop = 0;
      $('.dimensions').textContent = `${rendered.width} × ${rendered.height} px · ${(rendered.blob.size / 1024 / 1024).toFixed(1)} MB`;
      const layoutWarnings = warnings.filter(warning => [t('narrowLayout'), t('layoutOverflow')].includes(warning));
      $('.layout-note').textContent = layoutWarnings.join(' ');
      $('.layout-note').classList.toggle('hidden', !layoutWarnings.length);
      if (rendered.reduced) warnings.push(t('reduced'));
      status(warnings.length ? warnings.join(' ') : t('ready'));
      $('.save').disabled = false;
      $('.copy').disabled = !navigator.clipboard?.write || !globalThis.ClipboardItem;
    } catch (error) {
      if (version === revision && !closed) {
        $('.placeholder').textContent = t('previewFailed');
        $('.dimensions').textContent = t('failed');
        status(error.message || t('renderError'), 'error');
        $('.render-overlay').classList.remove('hidden');
      }
    } finally {
      running = false;
      updateRerender();
      if (!closed && renderRequested) render();
    }
  }
  shadow.querySelectorAll('.segments button').forEach(button => button.addEventListener('click', () => {
    const group = button.parentElement;
    if (options[group.dataset.option] === button.dataset.value) return;
    options[group.dataset.option] = button.dataset.value;
    group.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    if (validLayout(options)) saveSettings(options);
    settingsChanged();
  }));
  $('#autoRender').addEventListener('change', event => {
    options.autoRender = event.target.checked;
    if (validLayout(options)) saveSettings(options);
  });
  for (const name of ['widthMode', 'scale', 'prompt', 'showCredit', 'showImagePlaceholders']) $(`#${name}`).addEventListener('change', event => {
    options[name] = ['prompt', 'showCredit', 'showImagePlaceholders'].includes(name) ? event.target.checked : name === 'widthMode' ? event.target.value : Number(event.target.value); if (validLayout(options)) saveSettings(options); settingsChanged();
  });
  for (const name of ['width', 'customFontSize']) $(`#${name}`).addEventListener('input', event => {
    options[name] = event.target.value === '' ? NaN : Number(event.target.value);
    if (validLayout(options)) saveSettings(options);
    settingsChanged();
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
      if (!closed && current === result) {
        $('.copy').classList.add('copied');
        $('.copy span').textContent = `✓ ${t('copiedAction')}`;
        status(t('copied'), 'success');
      }
    } catch {
      if (!closed && current === result) {
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
    for (const name of ['widthMode', 'width', 'scale', 'customFontSize']) $(`#${name}`).value = String(options[name]);
    for (const name of ['prompt', 'showCredit', 'showImagePlaceholders', 'autoRender']) $(`#${name}`).checked = options[name];
    controls.forEach(control => { control.disabled = false; });
    settingsReady = true;
    settingsChanged();
    if (options.autoRender && answer) schedule();
  });
}
