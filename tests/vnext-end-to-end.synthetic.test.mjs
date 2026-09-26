import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDriveFile } from '../packages/drive-adapter/src/normalize.mjs';
import { prepareIngestion } from '../packages/core/src/intake-pipeline.mjs';
import { processImageWithProvider } from '../packages/processing/src/processors.mjs';
import { buildRegistryProjection } from '../packages/persistence/src/registry-projections.mjs';
import { buildTopicBlocks } from '../packages/knowledge/src/fusion.mjs';
import { retrieveEvidence } from '../packages/knowledge/src/retrieval.mjs';
import { buildLearnerState, createLearnerObservation } from '../packages/knowledge/src/learner.mjs';
import { evaluatePromotionCandidate } from '../packages/persistence/src/promotion.mjs';

test('synthetic source flows from Drive metadata to private promotion candidate', async () => {
  const normalized = normalizeDriveFile({
    id: 'IMG_SYNTH',
    name: 'slide.png',
    mimeType: 'image/png',
    md5Checksum: 'HASH_SYNTH',
    parents: ['SESSION_1'],
  }, {
    observedAt: '2026-09-27T00:00:00Z',
    parentLabels: { SESSION_1: 'Session 1' },
  });

  const prepared = prepareIngestion({
    ...normalized,
    authorization: { authorizationState: 'AUTHORIZED' },
  });

  assert.equal(prepared.context.status, 'RESOLVED_PRIMARY');
  assert.equal(prepared.processing.jobs[0].outcome, 'PLANNED');

  const provider = {
    async vision_extract() {
      return {
        text: 'Fourier transform maps a signal into frequency components.',
        provider: 'synthetic',
        model: 'fixture',
      };
    },
  };

  const processed = await processImageWithProvider({
    sourceVersionKey: normalized.sourceVersion.sourceVersionKey,
    contentAccess: { fixture: true },
    contextIds: ['drive-folder:SESSION_1'],
    provider,
  });

  processed.evidenceUnits[0].topicKey = 'fourier transform';
  processed.evidenceUnits[0].topicLabel = 'Fourier Transform';

  const projection = buildRegistryProjection({
    generatedAt: '2026-09-27T00:00:01Z',
    context: {
      contextId: 'drive-folder:SESSION_1',
      contextKind: 'session',
      label: 'Session 1',
    },
    sources: [normalized.source],
    artifacts: processed.artifacts,
    evidence: processed.evidenceUnits,
    processing: [{ processingId: 'P1', status: 'SUCCEEDED' }],
  });

  assert.equal(projection.manifest.counts.evidence, 1);

  const topics = buildTopicBlocks(processed.evidenceUnits);
  assert.equal(topics[0].label, 'Fourier Transform');

  const retrieved = retrieveEvidence({
    query: 'frequency components',
    contextIds: ['drive-folder:SESSION_1'],
    evidenceUnits: processed.evidenceUnits,
  });
  assert.equal(retrieved.length, 1);

  const observation = createLearnerObservation({
    subjectId: 'PRIVATE_USER',
    knowledgeId: topics[0].topicId,
    state: 'EXPOSED',
    confidence: 0.7,
    observedAt: '2026-09-27T00:00:02Z',
    evidenceRefs: [processed.evidenceUnits[0].evidenceId],
  });

  const learner = buildLearnerState({
    subjectId: 'PRIVATE_USER',
    knowledgeId: topics[0].topicId,
    observations: [observation],
  });
  assert.equal(learner.state, 'EXPOSED');

  const promotion = evaluatePromotionCandidate({
    kind: 'course_summary',
    private: true,
    evidenceState: 'SOURCE_SUPPORTED',
    provenance: { origin: 'synthetic_fixture' },
  });
  assert.equal(promotion.promotable, true);
  assert.equal(promotion.destination, 'career-memory');
});
