import { t, locale } from './i18n.js';
import { getAnswers, getTurn, getActionRow, isAnswerReady, STREAMING_SELECTOR, isStreaming } from './dom.js';
import { openPanel, exportIcon } from './panel.js';
import entryCSS from './entry.css';
import { WRITING_BLOCK_SELECTOR, WRITING_EDITOR_SELECTOR } from './chatgpt/selectors.js';

const marker = 'data-answer-imagifier';
const entryStyle = document.createElement('style');
entryStyle.textContent = entryCSS + `
body:has(${STREAMING_SELECTOR}) [${marker}]{display:none!important}
/* Adobe offsets this image action to reserve room for extra controls. Keep it
   in the native action layout, which already accounts for our button width. */
#chatgpt-chatview-adobe-express-entry-point{left:auto!important}
`;
document.head.append(entryStyle);
let hintId = 0;
function makeButton(targetAnswer, writingBlock) {
  const button = document.createElement('button');
  const label = t(writingBlock ? 'exportWritingBlock' : 'exportImage');
  button.type = 'button'; button.lang = locale === 'zh' ? 'zh-CN' : 'en'; button.setAttribute(marker, writingBlock ? 'writing-block' : 'export');
  button.setAttribute('aria-label', label);
  button.innerHTML = `${exportIcon}<span>${label}</span>`;
  if (writingBlock) {
    const hint = document.createElement('span');
    hint.id = `answer-imagifier-hint-${++hintId}`;
    hint.className = 'ai-entry-tooltip';
    hint.setAttribute('role', 'tooltip');
    hint.textContent = t('exportWritingBlockHint');
    button.setAttribute('aria-describedby', hint.id);
    button.append(hint);
  }
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (!isAnswerReady(targetAnswer)) return;
    if (!targetAnswer.isConnected) return;
    if (writingBlock) {
      if (targetAnswer.contains(writingBlock)) openPanel(targetAnswer, { writingBlock });
    } else openPanel(targetAnswer);
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
const writingButtons = new Map();
function writingToolbar(block) {
  if (!block.querySelector(WRITING_EDITOR_SELECTOR) || block.closest('[role="dialog"],[role="menu"]')) return null;
  const header = block.querySelector('header');
  let actions = header?.querySelector('button[aria-label="Copy"],button[aria-label="复制"],button[aria-label="複製"]');
  if (!actions) return null;
  while (actions.parentElement !== header) actions = actions.parentElement;
  return actions;
}
function placeAnswerButton(answer, turn) {
  const button = buttons.get(answer) || makeButton(answer);
  buttons.set(answer, button);
  const actionRow = getActionRow(answer, turn);
  if (actionRow) {
    if (button.parentElement !== actionRow || actionRow.lastElementChild !== button) actionRow.append(button);
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
  const answers = getAnswers().filter(isAnswerReady);
  const writingBlocks = new Set();
  for (const [answer, button] of buttons) {
    if (!answers.includes(answer)) { button.remove(); buttons.delete(answer); }
  }
  for (const answer of answers) {
    const turn = getTurn(answer);
    placeAnswerButton(answer, turn);
    for (const block of answer.querySelectorAll(WRITING_BLOCK_SELECTOR)) {
      const toolbar = writingToolbar(block);
      if (!toolbar) continue;
      writingBlocks.add(block);
      const button = writingButtons.get(block) || makeButton(answer, block);
      writingButtons.set(block, button);
      if (toolbar.firstElementChild !== button) toolbar.prepend(button);
    }
  }
  for (const [block, button] of writingButtons) {
    if (!writingBlocks.has(block)) { button.remove(); writingButtons.delete(block); }
  }
}
let timer;
new MutationObserver(mutations => {
  if (mutations.every(m => m.target instanceof Element && (m.target.closest('#answer-imagifier-root') || m.target.closest(`[${marker}]`)))) return;
  if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 180);
}).observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-testid', 'aria-label', 'data-is-streaming', 'data-message-author-role', 'data-content-search-unit-key', 'data-content-search-turn-key'] });
scan();
