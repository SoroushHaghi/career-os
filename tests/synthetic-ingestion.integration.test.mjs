import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDriveFile } from '../packages/drive-adapter/src/normalize.mjs';
import { prepareIngestion } from '../packages/core/src/intake-pipeline.mjs';
import { buildRegistryProjection } from '../packages/persistence/src/registry-projections.mjs';

test('authorized arbitrary folder is registered and held instead of discarded', () => {
  const normalized = normalizeDriveFile({
    id: 'FILE_AUDIO',
    name: 'sample.m4a',
    mimeType: 'audio/mpeg',
    md5Checksum: 'HASH_A',
    parents: ['FOLDER_TEST'],
  }, {
    observedAt: '2026-09-27T00:00:00Z',
    parentLabels: { FOLDER_TEST: 'test' },
  });

  const prepared = prepareIngestion({
    ...normalized,
    authorization: {
      authorizationState: 'AUTHORIZED',
      allowedProcessing: ['transcription'],
    },
  });

  assert.equal(prepared.sourceState, 'REGISTERED');
  assert.equal(prepared.context.status, 'UNCLASSIFIED_AUTHORIZED');
  assert.equal(prepared.processing.jobs[0].processorName, 'audio_transcribe');

  const projection = buildRegistryProjection({
    generatedAt: '2026-09-27T00:00:01Z',
    context: { contextId: 'internal:unclassified', contextKind: 'unclassified', label: 'Unclassified' },
    sources: [normalized.source],
    processing: prepared.processing.jobs.map((job, index) => ({
      processingId: 'P' + index,
      status: job.outcome,
    })),
  });

  assert.equal(projection.manifest.counts.sources, 1);
  assert.ok(projection.files['sources.jsonl'].includes('drive:FILE_AUDIO'));
});

test('same current transcript produces skip instead of provider work', () => {
  const normalized = normalizeDriveFile({
    id: 'FILE_AUDIO',
    name: 'sample.m4a',
    mimeType: 'audio/mpeg',
    md5Checksum: 'HASH_A',
    parents: ['FOLDER_10'],
  }, {
    observedAt: '2026-09-27T00:00:00Z',
    parentLabels: { FOLDER_10: 'L10' },
  });

  const prepared = prepareIngestion({
    ...normalized,
    authorization: { authorizationState: 'AUTHORIZED' },
    existingArtifacts: [{
      artifactId: 'TRANSCRIPT_1',
      artifactType: 'TRANSCRIPT',
      sourceVersionKey: normalized.sourceVersion.sourceVersionKey,
      processorVersion: '1',
      state: 'AVAILABLE',
    }],
  });

  assert.equal(prepared.context.status, 'RESOLVED_PRIMARY');
  assert.equal(prepared.processing.jobs[0].outcome, 'SKIPPED_CURRENT');
});
