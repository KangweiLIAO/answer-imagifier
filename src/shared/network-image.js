export const IMAGE_REQUEST = 'answer-imagifier:network-image';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);

export function isNetworkImageURL(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://images.openai.com' && !url.username && !url.password &&
      /^\/static-rsc-\d+\/[A-Za-z0-9_-]+$/.test(url.pathname);
  } catch { return false; }
}

export async function fetchImageData(url, fetchResource = fetch) {
  const response = await fetchResource(url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: AbortSignal.timeout(12000) });
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || !IMAGE_TYPES.has(type)) throw new Error('Image response unavailable');
  if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('Image too large');
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_IMAGE_BYTES) throw new Error('Image too large');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  let binary = '';
  for (const chunk of chunks) for (let offset = 0; offset < chunk.length; offset += 8192) binary += String.fromCharCode(...chunk.subarray(offset, offset + 8192));
  return `data:${type};base64,${btoa(binary)}`;
}

export async function loadImageData(url) {
  if (isNetworkImageURL(url) && globalThis.chrome?.runtime?.sendMessage) {
    const result = await chrome.runtime.sendMessage({ type: IMAGE_REQUEST, url });
    if (!result?.ok || !/^data:image\/(png|jpeg|webp|gif|avif);base64,/.test(result.data || '') || result.data.length > MAX_IMAGE_BYTES * 1.4 + 100) throw new Error('Image could not be read');
    return result.data;
  }
  return fetchImageData(url);
}
