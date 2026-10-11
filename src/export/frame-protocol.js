// Only ChatGPT's inline visualization sandbox participates in frame capture.
export const FRAME_CHANNEL = 'answer-imagifier:frame:v1';
export const MAX_FRAME_PIXELS = 16_000_000;
export const MAX_FRAME_DATA_LENGTH = 32_000_000;
export const FRAME_TIMEOUT = 25_000;

export function visualizationOrigin(src) {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && /^[a-z0-9-]+\.web-sandbox\.oaiusercontent\.com$/.test(url.hostname) ? url.origin : null;
  } catch { return null; }
}

export function isChatGPTOrigin(origin) {
  return origin === 'https://chatgpt.com' || origin === 'https://chat.openai.com';
}

export function validFrameImage(data) {
  return data?.ok === true && typeof data.png === 'string' &&
    data.png.length <= MAX_FRAME_DATA_LENGTH && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.png) &&
    Number.isInteger(data.width) && Number.isInteger(data.height) && data.width > 0 && data.height > 0 &&
    data.width * data.height <= MAX_FRAME_PIXELS;
}
