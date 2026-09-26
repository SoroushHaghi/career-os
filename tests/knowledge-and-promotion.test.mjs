import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTopicBlocks, createConflictRecord } from '../packages/knowledge/src/fusion.mjs';
import { retrieveEvidence } from '../packages/knowledge/src/retrieval.mjs';
import { buildLearnerState, createLearnerObservation } from '../packages/knowledge/src/learner.mjs';
import { evaluatePromotionCandidate } from '../packages/persistence/src/promotion.mjs';

test('fusion groups evidence without losing refs', () => {
  const blocks = buildTopicBlocks([
    { evidenceId: 'E1', topicKey: 'qft', topicLabel: 'QFT', modality: 'audio', contextIds: ['S1'] },
    { evidenceId: 'E2', topicKey: 'QFT', topicLabel: 'QFT', modality: 'pdf', contextIds: ['S1'] },
  ]);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].evidenceIds, ['E1', 'E2']);
  assert.deepEqual(blocks[0].modalities, ['audio', 'pdf']);
});

test('conflict requires multiple evidence refs', () => {
  assert.throws(() => createConflictRecord({ subject: 'x', evidenceIds: ['E1'] }));
  const conflict = createConflictRecord({
    subject: 'runtime',
    evidenceIds: ['E1', 'E2'],
    disagreementType: 'value',
  });
  assert.equal(conflict.status, 'OPEN');
});

test('retrieval stays evidence-bounded', () => {
  const results = retrieveEvidence({
    query: 'period finding',
    contextIds: ['S1'],
    evidenceUnits: [
      { evidenceId: 'E1', content: 'period finding with a transform', contextIds: ['S1'], modality: 'text' },
      { evidenceId: 'E2', content: 'unrelated note', contextIds: ['S2'], modality: 'text' },
    ],
  });
  assert.deepEqual(results.map((x) => x.evidence.evidenceId), ['E1']);
});

test('learner state is derived from private observations, not source mutation', () => {
  const observation = createLearnerObservation({
    subjectId: 'USER',
    knowledgeId: 'concept:qft',
    state: 'PARTIAL',
    confidence: 0.8,
    observedAt: '2026-09-27T00:00:00Z',
    evidenceRefs: ['OBS1'],
  });
  const state = buildLearnerState({
    subjectId: 'USER',
    knowledgeId: 'concept:qft',
    observations: [observation],
  });
  assert.equal(state.state, 'PARTIAL');
  assert.equal(state.knowledgeId, 'concept:qft');
});

test('promotion rejects raw media and public personal data', () => {
  const raw = evaluatePromotionCandidate({
    kind: 'course_summary',
    provenance: { origin: 'source' },
    evidenceState: 'SOURCE_SUPPORTED',
    rawMedia: true,
  });
  assert.equal(raw.promotable, false);

  const publicPersonal = evaluatePromotionCandidate({
    kind: 'durable_fact',
    provenance: { origin: 'user' },
    evidenceState: 'USER_CONFIRMED',
    private: false,
    containsPersonalData: true,
  });
  assert.equal(publicPersonal.promotable, false);
});
