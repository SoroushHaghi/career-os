import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, canTransition } from '../packages/core/src/state-machine.mjs';

test('job retry lifecycle is explicit', () => {
  assert.equal(canTransition('job', 'RUNNING', 'RETRY_WAIT'), true);
  assert.equal(canTransition('job', 'RETRY_WAIT', 'RUNNING'), true);
  assert.equal(canTransition('job', 'SUCCEEDED', 'RUNNING'), false);
});

test('successful artifact may later become stale or superseded', () => {
  assert.equal(canTransition('artifact', 'AVAILABLE', 'STALE'), true);
  assert.equal(canTransition('artifact', 'AVAILABLE', 'SUPERSEDED'), true);
});

test('failed enrichment does not imply artifact rollback', () => {
  assert.equal(canTransition('enrichment', 'RUNNING', 'FAILED_RETRYABLE'), true);
  assert.equal(canTransition('artifact', 'AVAILABLE', 'AVAILABLE'), true);
});

test('invalid transition throws', () => {
  assert.throws(() => assertTransition('promotion', 'PROMOTED', 'CANDIDATE'));
});
