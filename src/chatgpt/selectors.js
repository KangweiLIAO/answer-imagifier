const LEGACY_ANSWER_SELECTOR = '[data-message-author-role="assistant"]';
const UNIT_ANSWER_SELECTOR = '[data-content-search-unit-key$=":assistant"]';
export const USER_SELECTOR = '[data-message-author-role="user"],[data-content-search-unit-key$=":user"]';
export const ANSWER_SELECTOR = `${LEGACY_ANSWER_SELECTOR},${UNIT_ANSWER_SELECTOR}`;
export const TURN_SELECTOR = 'article,[data-testid^="conversation-turn-"],[data-content-search-turn-key]';
export const STREAMING_SELECTOR = '[data-testid="stop-button"],button[aria-label="Stop streaming"],button[aria-label="Stop generating"],button[aria-label="停止生成"],button[aria-label="停止產生"],[data-message-author-role="assistant"][data-is-streaming="true"],[data-content-search-unit-key$=":assistant"][data-is-streaming="true"]';
