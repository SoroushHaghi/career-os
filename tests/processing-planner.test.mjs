import test from 'node:test';
import assert from 'node:assert/strict';
import { planProcessing } from '../packages/processing/src/planner.mjs';
import { normalizeProviderError } from '../packages/processing/src/provider-contracts.mjs';

const auth = { authorizationState: 'AUTHORIZED' };
const version = { sourceVersionKey: 'drive:F1@md5:ABC' };

test('image source plans extraction when current artifact is absent', () => {
  const result = planProcessing({
    source: { sourceType: 'image' },
    sourceVersion: version,
    authorization: auth,
  });
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].outcome, 'PLANNED');
});

test('current transcript prevents redundant audio processing', () => {
  const result = planProcessing({
    source: { sourceType: 'audio' },
    sourceVersion: version,
    authorization: auth,
    existingArtifacts: [{
      artifactId: 'artifact:T1',
      artifactType: 'TRANSCRIPT',
      sourceVersionKey: version.sourceVersionKey,
      processorVersion: '1',
      state: 'AVAILABLE',
    }],
  });
  assert.equal(result.jobs[0].outcome, 'SKIPPED_CURRENT');
  assert.equal(result.jobs[0].existingArtifactId, 'artifact:T1');
});

test('unauthorized source is blocked before processor planning', () => {
  const result = planProcessing({
    source: { sourceType: 'audio' },
    sourceVersion: version,
    authorization: { authorizationState: 'UNKNOWN' },
  });
  assert.equal(result.blocked, true);
  assert.deepEqual(result.jobs, []);
});

test('provider rate limit remains retryable', () => {
  const result = normalizeProviderError({ httpStatus: 429, retryAfterMs: 15000 });
  assert.equal(result.category, 'RATE_LIMITED');
  assert.equal(result.retryable, true);
  assert.equal(result.retryAfterMs, 15000);
});
