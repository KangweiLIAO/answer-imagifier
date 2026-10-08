import { createDOM, inlineStyle, stubProperties } from './dom.mjs';

export function createBrowser(t, markup) {
  const { document, window } = createDOM(markup);
  const createElement = document.createElement.bind(document);
  stubProperties(t, document, {
    createElement(tag, ...args) {
      const node = createElement(tag, ...args);
      if (tag === 'dialog') {
        node.showModal = () => {};
        node.close = () => {};
      }
      if (tag === 'canvas') node.getContext = () => ({ measureText: text => ({ width: text.length * 8 }) });
      return node;
    },
  });
  stubProperties(t, window.HTMLImageElement.prototype, { decode: async () => {} });
  return {
    document, window,
    globals: {
      document, Element: window.Element, HTMLImageElement: window.HTMLImageElement,
      HTMLCanvasElement: window.HTMLCanvasElement, getComputedStyle: inlineStyle,
      requestAnimationFrame: callback => queueMicrotask(callback),
    },
  };
}
