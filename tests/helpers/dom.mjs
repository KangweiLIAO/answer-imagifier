import { parseHTML } from 'linkedom';
import { readFile } from 'node:fs/promises';

export function createDOM(markup) {
  const html = /^\s*(?:<!doctype|<html[\s>])/i.test(markup) ? markup : `<html><head></head><body>${markup}</body></html>`;
  return parseHTML(html);
}

export function readFixture(name) {
  return readFile(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8');
}

// Adapter unit tests need correspondence, not a second export pipeline.
export function cloneForAdapter(source, { omitted = new Set(), stripStyles = false, stripClasses = false } = {}) {
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  const map = new Map(copies.map((copy, index) => [copy, originals[index]]));
  for (const copy of copies) {
    if (omitted.has(map.get(copy))) copy.remove();
    if (stripStyles) copy.removeAttribute('style');
    if (stripClasses) copy.removeAttribute('class');
  }
  return { clone, map };
}

export function inlineStyle(source) {
  return Object.assign([], { getPropertyValue: name => source.style.getPropertyValue(name) || '' });
}

export function stubProperties(t, target, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(target, key)]));
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(target, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    }
  });
}
