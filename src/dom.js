import { t } from './i18n.js';
const LEGACY_ANSWER_SELECTOR = '[data-message-author-role="assistant"]';
const UNIT_ANSWER_SELECTOR = '[data-content-search-unit-key$=":assistant"]';
const USER_SELECTOR = '[data-message-author-role="user"],[data-content-search-unit-key$=":user"]';
export const ANSWER_SELECTOR = `${LEGACY_ANSWER_SELECTOR},${UNIT_ANSWER_SELECTOR}`;
export const TURN_SELECTOR = 'article,[data-testid^="conversation-turn-"],[data-content-search-turn-key]';
export const STREAMING_SELECTOR = '[data-testid="stop-button"],button[aria-label="Stop streaming"],button[aria-label="Stop generating"],button[aria-label="停止生成"],button[aria-label="停止產生"],[data-message-author-role="assistant"][data-is-streaming="true"],[data-content-search-unit-key$=":assistant"][data-is-streaming="true"]';
export function isStreaming() { return Boolean(document.querySelector(STREAMING_SELECTOR)); }
export function isExportableAnswer(answer) {
  return Boolean(messageText(answer)) && !answer.closest('[role="dialog"],dialog,[role="menu"]');
}
export function getAnswers() {
  const answers = [...document.querySelectorAll(ANSWER_SELECTOR)].filter(isExportableAnswer);
  // Prefer the complete content unit when both generations of markers coexist.
  return answers.filter(answer => !answers.some(other => other !== answer && other.contains(answer)));
}
export function getAnswerRoot(answer) {
  // Charts and additional markdown blocks can be siblings within a single message.
  return answer;
}
export function getTurn(answer) {
  return answer.closest(TURN_SELECTOR) || answer.parentElement;
}
function messageText(message) {
  const clone = message.cloneNode(true);
  clone.querySelectorAll('h4.sr-only,button,[data-answer-imagifier]').forEach(el => el.remove());
  return clone.textContent.trim();
}
export function getPrompt(answer) {
  const turn = answer.closest('[data-content-search-turn-key]');
  const localPrompt = turn?.querySelector(USER_SELECTOR);
  if (localPrompt) return messageText(localPrompt);
  const messages = [...document.querySelectorAll(`${ANSWER_SELECTOR},${USER_SELECTOR}`)]
    .filter(message => !message.closest('[role="dialog"],dialog,[role="menu"]'));
  for (let i = messages.indexOf(answer) - 1; i >= 0; i--) {
    if (messages[i].matches(USER_SELECTOR)) return messageText(messages[i]);
  }
  return '';
}
// New turns contain user and assistant action rows. Only accept a row after
// this answer, before the next message, and outside any dialog or answer body.
export function getActionRow(answer, turn = getTurn(answer)) {
  return [...turn.querySelectorAll('.turn-action-controls')].find(row => {
    if (answer.contains(row) || row.closest('[role="dialog"],dialog,[role="menu"]')) return false;
    if (!(answer.compareDocumentPosition(row) & 4)) return false;
    return ![...turn.querySelectorAll(`${ANSWER_SELECTOR},${USER_SELECTOR}`)].some(message =>
      message !== answer && !answer.contains(message) &&
      (answer.compareDocumentPosition(message) & 4) && (message.compareDocumentPosition(row) & 4));
  }) || null;
}
// The new layout renders its native answer actions when the response is ready.
// Text alone is not a completion signal: streaming and tool pauses also have text.
export function isAnswerReady(answer) {
  if (isStreaming()) return false;
  if (!answer.closest('[data-content-search-turn-key]')) return true;
  const row = getActionRow(answer);
  return Boolean(row?.querySelector('button:not([data-answer-imagifier])'));
}
export function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
export function fileName(title, format) {
  const base = (title || 'ChatGPT-answer')
    .replace(/\.(?:png|jpe?g)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 64);
  return `${base || 'ChatGPT-answer'}.${format}`;
}
export function exportScale(width, height, requested = 2) {
  // Bound both axis length and total allocation; never silently crop a long answer.
  const ratio = Math.min(requested, 16000 / width, 16000 / height, Math.sqrt(32_000_000 / (width * height)));
  if (ratio < 0.75) throw new Error(t('answerTooLong'));
  return ratio;
}
