export const CORNER_RADIUS = 24;

export function roundExport(canvas, format, theme, pixelRatio) {
  const context = canvas.getContext('2d');
  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, CORNER_RADIUS * pixelRatio);
  context.fill();
  context.restore();
  // JPEG has no alpha channel: flatten the rounded card onto a neutral matte.
  if (format === 'jpg') {
    context.save();
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = theme === 'dark' ? '#111111' : '#f0f0ee';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }
  return canvas;
}
