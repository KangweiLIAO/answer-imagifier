import { isNetworkImageURL } from '../../shared/network-image.js';

export function preserveNetworkImages({ clone, sourceByCopy, options = {} }) {
  for (const copy of clone.querySelectorAll('[data-d-component="image"]')) {
    const images = [...copy.querySelectorAll('img')].filter(img => isNetworkImageURL(img.src));
    if (!images.length) continue;
    const source = sourceByCopy.get(copy);
    copy.setAttribute('data-export-network-image-frame', '');
    // Keep authored geometry, rather than fixed heights measured on the page.
    const frame = source.parentElement;
    const imageOnly = frame.matches('[data-d-component="box"]') && frame.children.length === 1;
    if (options.showImages === false) {
      (imageOnly ? copy.parentElement : copy).remove();
      continue;
    }
    if (imageOnly) {
      copy.parentElement.setAttribute('data-export-network-image-container', '');
      copy.parentElement.removeAttribute('data-export-shape');
      copy.parentElement.style.height = 'auto';
    }
    for (const [original, target] of [[source, copy], ...(imageOnly ? [[frame, copy.parentElement]] : [])]) {
      for (const key of ['aspect-ratio', 'width', 'max-width', 'border-radius']) {
        const value = original.style.getPropertyValue(key);
        if (/^\d+(?:\.\d+)?(?:px|%|rem|em)?(?:\s*\/\s*\d+(?:\.\d+)?)?$/.test(value)) target.style.setProperty(key, value);
      }
    }
    for (const image of images) {
      const original = sourceByCopy.get(image);
      image.setAttribute('data-export-network-image', '');
      image.style.cssText = 'display:block;width:100%;height:100%;margin:0;object-fit:cover';
      const position = original.style.getPropertyValue('object-position');
      if (/^[\d.]+%\s+[\d.]+%$/.test(position)) image.style.objectPosition = position;
      image.removeAttribute('data-export-source-width');
    }
    copy.querySelectorAll('[data-d-image-loading],[data-d-component="loading-block"]').forEach(node => node.remove());
  }
}
