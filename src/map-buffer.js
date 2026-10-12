// Runs in the page's MAIN world before Mapbox creates its WebGL context.
// Content-script worlds cannot change the context options used by the page.
export function installMapBufferCapture(prototype) {
  const original = prototype.getContext;
  prototype.getContext = function(type, ...args) {
    if (['webgl', 'webgl2', 'experimental-webgl'].includes(type) &&
        this.matches('canvas.mapboxgl-canvas') && this.closest('[data-testid="chatgpt-map-canvas"]')) {
      args[0] = { ...args[0], preserveDrawingBuffer: true };
    }
    return Reflect.apply(original, this, [type, ...args]);
  };
}
