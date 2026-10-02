const SIZES = Object.freeze({ small: { fraction: .7, height: 360 }, standard: { fraction: .85, height: 600 }, large: { fraction: 1, height: 900 } });

function aspectRatio(asset) {
  if (asset.localName === 'svg') {
    const values = (asset.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values[2] > 0 && values[3] > 0) return values[2] / values[3];
  }
  const width = asset.naturalWidth || parseFloat(asset.getAttribute('width'));
  const height = asset.naturalHeight || parseFloat(asset.getAttribute('height'));
  return width > 0 && height > 0 ? width / height : null;
}

export function applyImageWidths(card, size = 'standard') {
  const preset = SIZES[size] || SIZES.standard;
  const assets = [...card.querySelectorAll('.answer-content img,.answer-content svg')].filter(asset =>
    !asset.closest('[data-math],[data-checklist-box],[data-export-icon]') && !asset.parentElement.closest('svg'));
  return assets.map((asset, index) => {
    const parent = asset.parentElement;
    const style = getComputedStyle(parent);
    const available = parent.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const ratio = aspectRatio(asset);
    const cap = ratio ? preset.height * ratio : Infinity;
    const width = Math.max(1, Math.min(available * preset.fraction, cap));
    const frame = card.ownerDocument.createElement('div');
    frame.className = 'export-image-frame';
    // Percentages keep following the card when automatic width expands it.
    frame.style.width = `${preset.fraction * 100}%`;
    if (Number.isFinite(cap)) frame.style.maxWidth = `${cap}px`;
    asset.before(frame);
    frame.append(asset);
    asset.style.width = '100%';
    asset.style.height = 'auto';
    asset.style.maxWidth = '100%';
    asset.style.margin = '0';
    asset.style.display = 'block';
    asset.removeAttribute('data-export-source-width');
    return { index, width };
  });
}
