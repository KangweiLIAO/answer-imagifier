import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/module.mjs';

test('review invitation persists independently and survives a page reload', async () => {
  const data = { exportSettings: { showCredit: false } };
  const globals = { chrome: { storage: { local: {
    get: async key => ({ [key]: data[key] }),
    set: async value => Object.assign(data, value),
  } } } };
  const invite = await loadModule('src/review-invite.js', { globals });
  assert.deepEqual(await Promise.all([invite.claimReviewInvite(), invite.claimReviewInvite()]), [true, false]);
  assert.deepEqual(data, { exportSettings: { showCredit: false }, reviewInviteShown: true });
  const reloaded = await loadModule('src/review-invite.js', { globals });
  assert.equal(await reloaded.claimReviewInvite(), false);
});

for (const failure of ['unavailable', 'get', 'set']) test(`review invitation tolerates ${failure} storage and suppresses repeats in the page`, async () => {
  const globals = failure === 'unavailable' ? {} : { chrome: { storage: { local: {
    get: async () => { if (failure === 'get') throw Error('read'); return {}; },
    set: async () => { throw Error('write'); },
  } } } };
  const invite = await loadModule('src/review-invite.js', { globals });
  assert.equal(await invite.claimReviewInvite(), true);
  assert.equal(await invite.claimReviewInvite(), false);
});
