import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeProviderBackoff,
  noteProviderSuccess,
  noteQuota429,
} from '../packages/processing/src/provider-cooldown.mjs';

test('quota circuit opens after the third consecutive 429', () => {
  let state = {};
  state = noteQuota429(state, { nowMs: 1000 });
  assert.equal(state.circuitOpened, false);
  state = noteQuota429(state, { nowMs: 1000 });
  assert.equal(state.circuitOpened, false);
  state = noteQuota429(state, { nowMs: 1000 });
  assert.equal(state.circuitOpened, true);
  assert.equal(state.level, 1);
  assert.equal(state.circuitDelayMs, 90000);
  assert.equal(state.globalBackoffUntil, 91000);
});

test('later circuit levels back off exponentially with cap', () => {
  const state = noteQuota429(
    { streak: 2, level: 3 },
    { nowMs: 0 },
  );
  assert.equal(state.circuitOpened, true);
  assert.equal(state.level, 4);
  assert.equal(state.circuitDelayMs, 300000);
});

test('provider success resets quota streak and circuit level', () => {
  const state = noteProviderSuccess(
    { streak: 2, level: 2, globalBackoffUntil: 500 },
    { nowMs: 1000 },
  );
  assert.deepEqual(state, {
    streak: 0,
    level: 0,
    globalBackoffUntil: 0,
    circuitOpened: false,
    circuitDelayMs: 0,
  });
});

test('shared backoff never moves backwards', () => {
  assert.equal(mergeProviderBackoff(5000, 3000), 5000);
  assert.equal(mergeProviderBackoff(5000, 9000), 9000);
});
