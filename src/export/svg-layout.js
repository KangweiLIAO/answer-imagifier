const XHTML = 'http://www.w3.org/1999/xhtml';
const TEXT_BLOCKS = 'p,h1,h2,h3,h4,h5,h6,ul,ol,li,pre,blockquote,td,th,.prompt,.card-header,[data-export-component=text],[data-export-component=title],[data-export-component=caption]';
const FIXED_ASSETS = 'svg,[data-math],.diagram,.native-diagram,[data-export-shape],[data-export-form-control]:not([data-export-form-text]),[data-export-image-placeholder],[data-export-network-image-frame],[data-export-network-image-container]';
const GREEN = [1, 254, 2];
const MAGENTA = [253, 1, 254];

// Work only on the serialized export clone. The user's answer and the measured
// staging card remain untouched; graphical assets keep their measured geometry.
export function prepareSvgLayout(uri) {
  const document = new DOMParser().parseFromString(decodeURIComponent(uri.slice(uri.indexOf(',') + 1)), 'image/svg+xml');
  const svg = document.documentElement;
  const card = svg.querySelector('foreignObject')?.firstElementChild;
  if (!card || document.querySelector('parsererror')) throw new Error('Invalid export SVG');
  const flowing = new Set([card]);
  for (const block of card.querySelectorAll('*')) {
    // Checklist labels and custom div/span wrappers can carry text without a
    // paragraph. Include actual text owners so their rows grow after wrapping.
    const hasText = [...block.childNodes].some(node => node.nodeType === 3 && /\S/.test(node.textContent));
    if (!block.matches(TEXT_BLOCKS) && !hasText) continue;
    if (block.matches('style,script')) continue;
    const asset = block.closest(FIXED_ASSETS);
    if (asset && card.contains(asset)) continue;
    for (let node = block; node && card.contains(node); node = node.parentElement) flowing.add(node);
  }
  for (const node of flowing) {
    node.style.setProperty('height', 'auto', 'important');
    // Recover sizing intent throughout the text flow, including centered flex
    // columns and nested inline groups. Computed pixel widths can wrap text at
    // a different glyph boundary in SVG. Authored widths remain authoritative;
    // the card and table layout retain the geometry measured by their owners.
    if (node !== card && !node.matches('table,colgroup,col,thead,tbody,tfoot,tr,td,th')) {
      node.style.setProperty('width', node.getAttribute('data-export-width') || 'auto', 'important');
    }
    if (['grid', 'inline-grid'].includes(node.style.display)) {
      // Computed row tracks are frozen pixel heights too. Keep columns and
      // placements, but let text determine the height of each exported row.
      node.style.setProperty('grid-template-rows', 'none', 'important');
      node.style.setProperty('grid-auto-rows', 'auto', 'important');
    }
  }

  // Two color bands locate the actual end of the reflowed content inside the
  // SVG image, where text metrics can differ from the ordinary DOM. Remove the
  // marker before the final render, so no measurement pixels enter the output.
  const marker = document.createElementNS(XHTML, 'div');
  marker.setAttribute('style', 'display:block;position:static;clear:both;box-sizing:border-box;width:8px;min-width:8px;max-width:8px;height:8px;min-height:8px;max-height:8px;margin:0;padding:0;border:0;line-height:0;font-size:0;background:rgb(1,254,2)');
  const band = document.createElementNS(XHTML, 'div');
  band.setAttribute('style', 'display:block;width:8px;height:4px;margin:0;padding:0;border:0;transform:translateY(4px);background:rgb(253,1,254)');
  marker.append(band);
  card.append(marker);
  const pixels = property => parseFloat(card.style.getPropertyValue(property)) || 0;
  return {
    svg, marker,
    markerX: pixels('border-left-width') + pixels('padding-left') + 4,
    bottomInset: pixels('padding-bottom') + pixels('border-bottom-width'),
  };
}

export function svgLayoutUri(layout, width, height) {
  layout.svg.setAttribute('width', String(width));
  layout.svg.setAttribute('height', String(height));
  layout.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(layout.svg))}`;
}

export function findSvgContentHeight(canvas, layout, ratio) {
  const column = canvas.getContext('2d').getImageData(Math.floor(layout.markerX * ratio), 0, 1, canvas.height).data;
  const matches = (row, color) => color.every((value, channel) => column[row * 4 + channel] === value) && column[row * 4 + 3] === 255;
  // Search from the bottom and require both bands, avoiding ordinary text or
  // a single matching color in a chart being mistaken for the end marker.
  for (let row = canvas.height - 1; row > 0; row--) {
    if (!matches(row, MAGENTA)) continue;
    let top = row - 1;
    // A fractional layout coordinate can leave one antialiased boundary row.
    if (!matches(top, GREEN)) top--;
    if (top < 0 || !matches(top, GREEN)) continue;
    while (top > 0 && matches(top - 1, GREEN)) top--;
    return Math.ceil(top / ratio + layout.bottomInset);
  }
  return null;
}

export async function drawSvg(uri, width, height, ratio, background) {
  const image = new Image();
  image.src = uri;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
