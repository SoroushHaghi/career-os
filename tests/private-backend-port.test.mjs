import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumePromotionOutbox,
  createPrivateBackendPort,
} from '../packages/persistence/src/private-backend-port.mjs';
import {
  buildPromotionRecord,
  evaluatePromotionCandidate,
} from '../packages/persistence/src/promotion.mjs';

test('private backend port writes only Career Memory promotion records', async () => {
  const writes = [];
  const port = createPrivateBackendPort({
    async writePromotion(record) {
      writes.push(record);
      return { ok: true, recordId: 'R1' };
    },
  });

  const result = await port.writePromotion({
    destination: 'career-memory',
    provenance: { origin: 'USER_CONFIRMED' },
  });

  assert.equal(result.ok, true);
  assert.equal(writes.length, 1);
  await assert.rejects(
    () => port.writePromotion({
      destination: 'public',
      provenance: { origin: 'USER_CONFIRMED' },
    }),
    /Career Memory/
  );
});

test('promotion outbox consumer writes supported low-risk records', async () => {
  const writes = [];
  const port = createPrivateBackendPort({
    async writePromotion(record) {
      writes.push(record);
      return { ok: true, recordId: 'R1' };
    },
  });

  const result = await consumePromotionOutbox({
    outbox: {
      candidates: [{
        candidateId: 'C1',
        kind: 'course_summary',
        evidenceState: 'SOURCE_SUPPORTED',
        evidenceRefs: ['E1'],
        provenance: { origin: 'SOURCE' },
      }],
    },
    evaluate: evaluatePromotionCandidate,
    buildRecord: buildPromotionRecord,
    port,
  });

  assert.equal(result[0].written, true);
  assert.equal(writes[0].destination, 'career-memory');
});

test('inferred promotion remains review-gated', async () => {
  const port = createPrivateBackendPort({
    async writePromotion() {
      throw new Error('should not write');
    },
  });

  const result = await consumePromotionOutbox({
    outbox: {
      candidates: [{
        candidateId: 'C1',
        kind: 'learner_pattern',
        evidenceState: 'INFERRED',
        evidenceRefs: ['E1'],
        provenance: { origin: 'AI_INFERENCE' },
      }],
    },
    evaluate: evaluatePromotionCandidate,
    buildRecord: buildPromotionRecord,
    port,
  });

  assert.equal(result[0].written, false);
  assert.equal(result[0].reviewRequired, true);
});
