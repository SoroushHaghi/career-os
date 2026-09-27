import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromotionOutbox,
  pendingPromotionCandidates,
  serializePromotionOutbox,
} from '../packages/persistence/src/promotion-outbox.mjs';

test('promotion outbox always targets the private Career Memory boundary', () => {
  const outbox = buildPromotionOutbox({
    contextId: 'ctx:1',
    generatedAt: '2026-09-27T00:00:00Z',
    candidates: [{
      candidateId: 'C1',
      kind: 'course_summary',
      evidenceState: 'SOURCE_SUPPORTED',
      evidenceRefs: ['E1'],
    }],
  });
  assert.equal(outbox.candidates[0].privateDestination, 'career-memory');
  assert.equal(pendingPromotionCandidates(outbox).length, 1);
});

test('promotion outbox serialization is machine-readable', () => {
  const outbox = buildPromotionOutbox({
    contextId: 'ctx:1',
    generatedAt: '2026-09-27T00:00:00Z',
  });
  assert.deepEqual(JSON.parse(serializePromotionOutbox(outbox)), outbox);
});
