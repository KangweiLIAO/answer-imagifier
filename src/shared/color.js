// Classify from the source DOM, before host classes and layout styles disappear.
export function isChromaticColor(color) {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return Math.max(...rgb.slice(1).map(Number)) - Math.min(...rgb.slice(1).map(Number)) > 12;
  const oklch = color.match(/^oklch\(\s*[\d.%]+\s+([\d.]+)/i);
  return Boolean(oklch && Number(oklch[1]) > .025);
}
