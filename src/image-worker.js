import { IMAGE_REQUEST, isNetworkImageURL, fetchImageData } from './shared/network-image.js';

export function allowedImageRequest(message, sender) {
  try {
    return message?.type === IMAGE_REQUEST && isNetworkImageURL(message.url) && sender.frameId === 0 &&
      ['https://chatgpt.com', 'https://chat.openai.com'].includes(new URL(sender.tab?.url).origin);
  } catch { return false; }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!allowedImageRequest(message, sender)) return false;
  fetchImageData(message.url).then(data => respond({ ok: true, data }), () => respond({ ok: false }));
  return true;
});
