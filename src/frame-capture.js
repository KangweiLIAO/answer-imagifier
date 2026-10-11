import { toCanvas } from 'html-to-image';
import { FRAME_CHANNEL, MAX_FRAME_PIXELS, MAX_FRAME_DATA_LENGTH, isChatGPTOrigin } from './export/frame-protocol.js';

export function frameDocument(document) {
  // Skybridge hosts the visualization in a full-size, same-origin about:blank
  // child. Capture that document rather than rasterizing an empty wrapper.
  for (let depth = 0; depth < 5; depth++) {
    const visible = [...(document.body?.children || [])].filter(node =>
      !['SCRIPT', 'STYLE', 'LINK'].includes(node.nodeName) && !node.hidden);
    if (visible.length !== 1 || visible[0].nodeName !== 'IFRAME') break;
    const child = visible[0];
    const rect = child.getBoundingClientRect();
    if (Math.abs(rect.left) > 1 || Math.abs(rect.top) > 1 || Math.abs(rect.width - document.defaultView.innerWidth) > 1) break;
    const inner = child.contentDocument;
    if (!inner?.body || !inner.body.children.length) throw new Error('Visualization not ready');
    document = inner;
  }
  if (document.querySelector('iframe,object,embed')) throw new Error('Unsupported nested embed');
  return document;
}

export async function captureFrame(document, scale = 2) {
  document = frameDocument(document);
  await document.fonts.ready;
  await Promise.all([...document.images].map(async image => {
    if (image.currentSrc || image.src) await image.decode();
  }));
  const view = document.defaultView;
  const root = document.documentElement;
  const width = Math.ceil(view.innerWidth);
  const height = Math.ceil(Math.max(view.innerHeight, root.scrollHeight, document.body?.scrollHeight || 0));
  if (width <= 0 || height <= 0 || width * height > MAX_FRAME_PIXELS) throw new Error('Frame too large');
  const pixelRatio = Math.min(Math.max(1, Number(scale) || 2), 3, Math.sqrt(MAX_FRAME_PIXELS / (width * height)));
  const canvas = await toCanvas(root, {
    width, height, pixelRatio, skipAutoScale: true,
    filter: node => !['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED'].includes(node.nodeName),
  });
  const png = canvas.toDataURL('image/png');
  if (png.length > MAX_FRAME_DATA_LENGTH) throw new Error('Frame image too large');
  return { ok: true, png, width: canvas.width, height: canvas.height };
}

export function installFrameCapture(host, capture = captureFrame, allowedParent = isChatGPTOrigin) {
  if (host.parent === host) return;
  let busy = false;
  host.addEventListener('message', async event => {
    const data = event.data;
    if (event.source !== host.parent || !allowedParent(event.origin) || data?.channel !== FRAME_CHANNEL ||
        data.type !== 'capture' || typeof data.id !== 'string' || data.id.length > 100) return;
    const reply = result => host.parent.postMessage({ ...result, channel: FRAME_CHANNEL, type: 'result', id: data.id }, event.origin);
    if (busy) { reply({ ok: false }); return; }
    busy = true;
    try { reply(await capture(host.document, data.scale)); }
    catch { reply({ ok: false }); }
    finally { busy = false; }
  });
}
