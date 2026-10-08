import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubProperties } from './helpers/dom.mjs';
import { messages, resolveLanguage, translate } from '../src/i18n.js';

test('Chinese locales select Chinese and all other locales fall back to English', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-HK', 'zh-Hans', 'ZH_cn']) assert.equal(resolveLanguage(locale), 'zh');
  for (const locale of ['en-US', 'en-GB', 'fr-FR', 'ja-JP', '']) assert.equal(resolveLanguage(locale), 'en');
});
test('every interface message has both translations and placeholders interpolate', () => {
  for (const [key, value] of Object.entries(messages)) {
    assert.ok(value.zh && value.en, key);
    assert.deepEqual(value.zh.match(/\{\w+\}/g) || [], value.en.match(/\{\w+\}/g) || [], key);
  }
  assert.equal(translate('save', 'zh-CN', { format: 'PNG' }), '保存 PNG');
  assert.equal(translate('save', 'fr-FR', { format: 'JPG' }), 'Save JPG');
});
test('Chrome UI language takes precedence over navigator language', async t => {
  stubProperties(t, globalThis, { chrome: { i18n: { getUILanguage: () => 'zh-TW' } } });
  const module = await import('../src/i18n.js?chrome-language-test');
  assert.equal(module.locale, 'zh');
});
