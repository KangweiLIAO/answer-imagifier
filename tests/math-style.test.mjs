import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inheritMathForeground } from '../src/math-style.js';

function styleDeclaration(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getPropertyValue: property => values.get(property) || '',
    setProperty: (property, value) => values.set(property, value),
  };
}
test('copied math foreground follows the export theme', () => {
  const htmlMath = { namespaceURI: 'http://www.w3.org/1999/xhtml', style: styleDeclaration() };
  inheritMathForeground(htmlMath);
  assert.equal(htmlMath.style.getPropertyValue('color'), 'inherit');
  assert.equal(htmlMath.style.getPropertyValue('-webkit-text-fill-color'), 'currentColor');
  assert.equal(htmlMath.style.getPropertyValue('border-bottom-color'), 'currentColor');

  const svgGlyph = {
    namespaceURI: 'http://www.w3.org/2000/svg',
    style: styleDeclaration({ fill: 'rgb(0, 0, 0)', stroke: 'none' }),
  };
  inheritMathForeground(svgGlyph);
  assert.equal(svgGlyph.style.getPropertyValue('fill'), 'currentColor');
  assert.equal(svgGlyph.style.getPropertyValue('stroke'), 'none');
});
