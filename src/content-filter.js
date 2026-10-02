// Filter on the original DOM, before class names and image metadata are removed.
const CITATIONS = [
  '[data-testid*="citation"]', '[data-citation-id]', '[data-citation-index]',
  '[data-citation-marker]', '[data-type="citation"]', '.citation', '.citation-container',
  '[class*="citation-pill"]', '[class*="group/citation"]',
  'a[href^="#cite"]', 'a[href^="#ref-"]', '[role="doc-noteref"]',
].join(',');

function isSiteIcon(img) {
  return /favicon|\/s2\/favicons|\/favicons\//i.test(img.currentSrc || img.getAttribute('src') || '') ||
    /favicon|site icon|website icon|网站图标/i.test(img.getAttribute('alt') || '');
}

export function excludedContent(source) {
  const omitted = new Set(source.querySelectorAll(`${CITATIONS},.sr-only,.visually-hidden,[role="tooltip"],.recharts-tooltip-wrapper,[data-d-component="tooltip"]`));
  // Screen-reader chart data and transient hover overlays are not visible
  // answer content. Filter before their host classes are stripped.
  for (const link of source.querySelectorAll('a')) {
    // Citation pills commonly live in not-prose spans and contain a site icon.
    const icon = [...link.querySelectorAll('img')].some(isSiteIcon);
    const pill = link.closest('.not-prose,[class*="rounded-full"]');
    const citationURL = /[?&]utm_source=chatgpt\.com(?:&|$)/.test(link.getAttribute('href') || '');
    if (icon || (citationURL && pill && (pill.textContent || '').length < 250)) {
      omitted.add(pill && source.contains(pill) && !pill.querySelector('p,pre,table,h1,h2,h3') ? pill : link);
    }
  }
  // Image generation has its own native download flow. Omit its controls and
  // assets, while retaining ordinary SVG and Canvas charts in the answer.
  for (const image of source.querySelectorAll('img,picture,[data-testid*="image-generation"],[data-testid*="generated-image"],[data-image-generation]')) {
    if (image.matches('img[data-d-component="svg"]') &&
        /^data:image\/svg\+xml[;,]/i.test(image.currentSrc || image.getAttribute('src') || '') &&
        !image.closest('[data-testid*="image-generation"],[data-testid*="generated-image"],[data-image-generation]')) continue;
    omitted.add(image);
  }
  return omitted;
}
