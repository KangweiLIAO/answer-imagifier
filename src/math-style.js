const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Computed styles copied from the page contain resolved foreground colors.
// Replace them with currentColor so formulas follow the export theme instead.
const FOREGROUND_COLOR_PROPERTIES = [
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'column-rule-color',
  'outline-color',
  'text-decoration-color',
  'text-emphasis-color',
];

export function inheritMathForeground(element) {
  element.style.setProperty('color', 'inherit');
  for (const property of FOREGROUND_COLOR_PROPERTIES) {
    element.style.setProperty(property, 'currentColor');
  }

  if (element.namespaceURI !== SVG_NAMESPACE) return;
  if (element.style.getPropertyValue('fill') !== 'none') {
    element.style.setProperty('fill', 'currentColor');
  }
  if (element.style.getPropertyValue('stroke') !== 'none') {
    element.style.setProperty('stroke', 'currentColor');
  }
}
