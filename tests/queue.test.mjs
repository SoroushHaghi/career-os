import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueUnique, retryDelayMs, scheduleRetry } from '../packages/processing/src/queue.mjs';

const job = {
  sourceVersionKey: 'drive:F1@md5:A',
  processorName: 'audio_transcribe',
  processorVersion: '1',
  processingProfileVersion: '1',
};

test('same job identity is not enqueued twice', () => {
  const first = enqueueUnique([], job);
  const second = enqueueUnique(first.queue, job);
  assert.equal(first.added, true);
  assert.equal(second.added, false);
  assert.equal(second.queue.length, 1);
});

test('provider retry hint wins when present', () => {
  assert.equal(retryDelayMs({ retryAfterMs: 12000, attempt: 8, baseDelayMs: 5000 }), 12000);
});

test('fallback retry uses bounded exponential delay', () => {
  assert.equal(retryDelayMs({ attempt: 2, baseDelayMs: 1000, maxDelayMs: 10000 }), 4000);
  assert.equal(retryDelayMs({ attempt: 20, baseDelayMs: 1000, maxDelayMs: 10000 }), 10000);
});

test('retry scheduling preserves job identity', () => {
  const first = enqueueUnique([], job).queue[0];
  const next = scheduleRetry(first, { nowMs: 1000, retryAfterMs: 5000, lastError: 'temporary' });
  assert.equal(next.jobKey, first.jobKey);
  assert.equal(next.nextAttemptAt, 6000);
  assert.equal(next.attempts, 1);
});
