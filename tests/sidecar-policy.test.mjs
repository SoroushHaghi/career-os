import test from 'node:test';
import assert from 'node:assert/strict';
import {
  careerOsSidecarName,
  chooseSidecarWritePlan,
  plainTextSidecarName,
  uniqueCareerOsSidecarName,
} from '../packages/drive-adapter/src/sidecar-policy.mjs';

test('plain sidecar keeps legacy same-name convention', () => {
  assert.equal(plainTextSidecarName('lecture.m4a'), 'lecture.txt');
});

test('owned preferred sidecar may be updated', () => {
  const plan = chooseSidecarWritePlan({
    sourceName: 'lecture.m4a',
    sourceId: 'SRC_12345678',
    preferredCandidates: [{
      id: 'TXT1',
      appProperties: {
        careerOsGenerated: 'true',
        careerOsSourceId: 'SRC_12345678',
      },
    }],
  });
  assert.equal(plan.action, 'UPDATE_OWNED');
  assert.equal(plan.targetName, 'lecture.txt');
});

test('manual preferred sidecar is preserved', () => {
  const plan = chooseSidecarWritePlan({
    sourceName: 'lecture.m4a',
    sourceId: 'SRC_12345678',
    preferredCandidates: [{ id: 'MANUAL' }],
  });
  assert.equal(plan.action, 'CREATE');
  assert.equal(plan.targetName, careerOsSidecarName('lecture.m4a'));
  assert.equal(plan.reason, 'manual_preferred_preserved');
});

test('all occupied names fall back to stable source-id suffix', () => {
  const plan = chooseSidecarWritePlan({
    sourceName: 'lecture.m4a',
    sourceId: 'SRC_12345678',
    preferredCandidates: [{ id: 'MANUAL' }],
    fallbackCandidates: [{ id: 'OTHER' }],
  });
  assert.equal(plan.targetName, uniqueCareerOsSidecarName('lecture.m4a', 'SRC_12345678'));
  assert.equal(plan.targetName, 'lecture.career-os-12345678.txt');
});
