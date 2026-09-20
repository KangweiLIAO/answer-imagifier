import { PLUGIN_NAME, t, locale } from './i18n.js';
import { getAnswers, getTurn, getActionRow, STREAMING_SELECTOR, isStreaming } from './dom.js';
import { openPanel, exportIcon } from './panel.js';

const marker = 'data-answer-imagifier';
const streamingStyle = document.createElement('style');
streamingStyle.textContent = `body:has(${STREAMING_SELECTOR}) [${marker}]{display:none!important}`;
document.head.append(streamingStyle);
function makeButton(targetAnswer) {
  const button = document.createElement('button');
  button.type = 'button'; button.lang = locale === 'zh' ? 'zh-CN' : 'en'; button.setAttribute(marker, 'export');
  button.setAttribute('aria-label', t('exportImage'));
  button.title = `${PLUGIN_NAME} · ${t('exportImage')}`;
  button.innerHTML = `${exportIcon}<span>${t('exportImage')}</span>`;
  button.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 12px;border:1px solid color-mix(in srgb,currentColor 15%,transparent);border-radius:9px;background:transparent;color:inherit;font:500 13px/1.4 system-ui;cursor:pointer;white-space:nowrap;min-height:36px;flex-shrink:0;margin-inline:12px;';
  // ChatGPT gives action buttons a fixed icon width; this control also has a label.
  button.style.setProperty('width', 'max-content', 'important');
  button.style.setProperty('min-width', 'max-content', 'important');
  button.style.setProperty('max-width', 'none', 'important');
  button.style.setProperty('box-sizing', 'border-box');
  button.querySelector('svg').style.cssText = 'width:17px;height:17px;flex:none;';
  button.addEventListener('mouseenter', () => { button.style.background = 'color-mix(in srgb,currentColor 7%,transparent)'; });
  button.addEventListener('mouseleave', () => { button.style.background = 'transparent'; });
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (isStreaming()) return;
    if (targetAnswer.isConnected) openPanel(targetAnswer);
  });
  return button;
}
function isShareButton(button) {
  if (button.hasAttribute(marker)) return false;
  const label = button.getAttribute('aria-label') || button.textContent.trim();
  return button.dataset.testid === 'share-chat-button' || /^(Share|Share chat|Share conversation|Share response|分享|共享|分享回答|分享对话|分享聊天|分享對話)$/i.test(label);
}
function isNativeAction(button) {
  if (button.hasAttribute(marker)) return false;
  if (/^(copy|good-response|bad-response|share|retry|regenerate|more)-turn-action-button$/.test(button.dataset.testid || '')) return true;
  const label = button.getAttribute('aria-label') || button.textContent.trim();
  return isShareButton(button) || /^(Copy(?: response)?|Good response|Bad response|Read aloud|Try again(?:…|\.{3})?|Regenerate(?: response)?|More(?: actions| options)?|复制|複製|赞|踩|朗读|重新生成|重试|更多(?:操作|选项)?)$/i.test(label);
}
const buttons = new Map();
function placeAnswerButton(answer, turn) {
  const button = buttons.get(answer) || makeButton(answer);
  buttons.set(answer, button);
  const actionRow = getActionRow(answer, turn);
  if (actionRow) {
    if (button.parentElement !== actionRow || actionRow.lastElementChild !== button) actionRow.append(button);
    return;
  }
  // A new-layout turn includes user actions too; never use those as fallback.
  if (turn.hasAttribute('data-content-search-turn-key')) {
    if (answer.nextElementSibling !== button) answer.after(button);
    return;
  }
  const actions = [...turn.querySelectorAll('button')].filter(el => !answer.contains(el) && isNativeAction(el));
  if (!actions.length) {
    if (answer.nextElementSibling !== button) answer.after(button);
    return;
  }
  // Find the action row even when native controls have tooltip/menu wrappers.
  let row = actions[0].parentElement;
  while (row !== turn && !actions.every(el => row.contains(el))) row = row.parentElement;
  if (row === turn || row.contains(answer)) row = actions.at(-1).parentElement;
  let last = actions.at(-1);
  while (last.parentElement !== row && row.contains(last.parentElement)) last = last.parentElement;
  if (last.nextElementSibling !== button) last.after(button);
}
function scan() {
  if (isStreaming()) return;
  const answers = getAnswers();
  for (const [answer, button] of buttons) {
    if (!answers.includes(answer)) { button.remove(); buttons.delete(answer); }
  }
  for (const answer of answers) {
    const turn = getTurn(answer);
    placeAnswerButton(answer, turn);
  }
}
let timer;
new MutationObserver(mutations => {
  if (mutations.every(m => m.target instanceof Element && (m.target.closest('#answer-imagifier-root') || m.target.closest(`[${marker}]`)))) return;
  if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 180);
}).observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-testid', 'aria-label', 'data-is-streaming', 'data-message-author-role', 'data-content-search-unit-key', 'data-content-search-turn-key'] });
scan();
