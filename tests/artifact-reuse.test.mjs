import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedArtifactReuseDecision } from '../packages/processing/src/artifact-reuse.mjs';

test('exact content fingerprint reuses current generated artifact', () => {
  const decision = generatedArtifactReuseDecision({
    sourceId: 'F1',
    sourceFingerprint: 'HASH_A',
    candidate: {
      appProperties: {
        careerOsGenerated: 'true',
        careerOsSourceId: 'F1',
        careerOsSourceFingerprint: 'HASH_A',
      },
    },
  });
  assert.deepEqual(decision, { reusable: true, reason: 'content_fingerprint', upgradeFingerprint: false });
});

test('modifiedTime-only compatibility can be upgraded to fingerprint', () => {
  const decision = generatedArtifactReuseDecision({
    sourceId: 'F1',
    sourceFingerprint: 'HASH_A',
    sourceModifiedTime: 'T1',
    candidate: {
      appProperties: {
        careerOsGenerated: 'true',
        careerOsSourceId: 'F1',
        careerOsSourceModifiedTime: 'T1',
      },
    },
  });
  assert.equal(decision.reusable, true);
  assert.equal(decision.upgradeFingerprint, true);
});

test('different source content cannot reuse stale artifact', () => {
  const decision = generatedArtifactReuseDecision({
    sourceId: 'F1',
    sourceFingerprint: 'HASH_NEW',
    sourceModifiedTime: 'T2',
    candidate: {
      appProperties: {
        careerOsGenerated: 'true',
        careerOsSourceId: 'F1',
        careerOsSourceFingerprint: 'HASH_OLD',
        careerOsSourceModifiedTime: 'T1',
      },
    },
  });
  assert.equal(decision.reusable, false);
});
