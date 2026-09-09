import { t } from './i18n.js';
export const ANSWER_SELECTOR = '[data-message-author-role="assistant"]';
export const STREAMING_SELECTOR = '[data-testid="stop-button"],button[aria-label="Stop streaming"],button[aria-label="Stop generating"],button[aria-label="停止生成"],button[aria-label="停止產生"],[data-message-author-role="assistant"][data-is-streaming="true"]';
export function isStreaming() { return Boolean(document.querySelector(STREAMING_SELECTOR)); }
export function isExportableAnswer(answer) {
  return Boolean(answer.textContent.trim()) && !answer.closest('[role="dialog"],dialog,[role="menu"]');
}
export function getAnswers() {
  return [...document.querySelectorAll(ANSWER_SELECTOR)].filter(isExportableAnswer);
}
export function getAnswerRoot(answer) {
  // Charts and additional markdown blocks can be siblings within a single message.
  return answer;
}
export function getPrompt(answer) {
  const messages = [...document.querySelectorAll('[data-message-author-role]')];
  for (let i = messages.indexOf(answer) - 1; i >= 0; i--) {
    if (messages[i].dataset.messageAuthorRole === 'user') return messages[i].textContent.trim();
  }
  return '';
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
