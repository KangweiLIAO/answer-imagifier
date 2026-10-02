export const WIDTH_LIMITS = Object.freeze({ min: 600, max: 1600 });
export const FONT_LIMITS = Object.freeze({ min: 12, max: 24 });
export function inRange(value, limits) {
  return Number.isInteger(value) && value >= limits.min && value <= limits.max;
}
export function validLayout(options) {
  return (options.widthMode !== 'custom' || inRange(options.width, WIDTH_LIMITS)) &&
    (options.fontSize !== 'custom' || inRange(options.customFontSize, FONT_LIMITS));
}
export function baseFontSize(options) {
  return options.fontSize === 'custom' ? options.customFontSize : ({small:14,standard:16,large:18}[options.fontSize] || 16);
}
export function recommendedWidth(card, options) {
  const font = baseFontSize(options);
  const padding = 80;
  let width = Math.max(760, Math.ceil(760 * font / 16));
  for (const table of card.querySelectorAll('.answer-content table')) {
    const columns = Math.max(0, ...[...table.rows].map(row => [...row.cells].reduce((sum, cell) => sum + (cell.colSpan || 1), 0)));
    width = Math.max(width, columns * Math.ceil(120 * font / 16) + padding);
  }
  for (const svg of card.querySelectorAll('.answer-content svg:not([data-checklist-box]):not([data-export-icon])')) {
    if (!svg.closest('[data-math]')) width = Math.max(width, (svg.viewBox?.baseVal?.width || 0) + padding);
  }
  return Math.min(WIDTH_LIMITS.max, Math.ceil(width));
}
export function hasLayoutOverflow(card) {
  return card.scrollWidth > card.clientWidth + 1 || [...card.querySelectorAll('.answer-content,.answer-content table,.answer-content [data-export-component=row]')]
    .some(node => node.scrollWidth > node.clientWidth + 1);
}
