import { FRAME_CHANNEL, FRAME_TIMEOUT, visualizationOrigin, validFrameImage } from './frame-protocol.js';

export function requestFrameImage(frame, { host = window, timeout = FRAME_TIMEOUT, scale = 2 } = {}) {
  const origin = visualizationOrigin(frame.src);
  if (!origin || !frame.contentWindow) return Promise.resolve(null);
  return new Promise(resolve => {
    const id = host.crypto.randomUUID();
    let timer;
    const finish = image => {
      host.clearTimeout(timer);
      host.removeEventListener('message', receive);
      resolve(image);
    };
    const receive = event => {
      const data = event.data;
      if (event.source !== frame.contentWindow || event.origin !== origin ||
          data?.channel !== FRAME_CHANNEL || data.type !== 'result' || data.id !== id) return;
      finish(validFrameImage(data) ? data : null);
    };
    host.addEventListener('message', receive);
    timer = host.setTimeout(() => finish(null), timeout);
    try { frame.contentWindow.postMessage({ channel: FRAME_CHANNEL, type: 'capture', id, scale }, origin); }
    catch { finish(null); }
  });
}

export async function preserveIframeSnapshots({ clone, sourceByCopy, options }, capture = requestFrameImage) {
  for (const copy of clone.querySelectorAll('iframe')) {
    const source = sourceByCopy.get(copy);
    if (!source || !visualizationOrigin(source.src)) continue;
    let result;
    try { result = await capture(source, { scale: options.scale || 2 }); } catch { continue; }
    if (!validFrameImage(result)) continue;
    const image = clone.ownerDocument.createElement('img');
    image.src = result.png;
    image.alt = source.title || 'ChatGPT visualization';
    image.width = result.width;
    image.height = result.height;
    image.setAttribute('data-export-iframe-snapshot', '');
    // The embedded page keeps its own appearance; export theme does not recolor it.
    image.style.cssText = 'display:block;width:100%;height:auto;max-width:100%';
    copy.replaceWith(image);
  }
}
