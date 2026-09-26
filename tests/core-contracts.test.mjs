import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArtifact,
  createContext,
  createContextBinding,
  createProcessingAuthorization,
  createSource,
  createSourceVersion,
} from '../packages/core/src/contracts.mjs';

test('source and source version preserve stable identity independent of label', () => {
  const source = createSource({
    sourceSystem: 'drive',
    sourceId: 'FILE_X',
    sourceType: 'audio',
    name: 'sample-file.m4a',
    mimeType: 'audio/mpeg',
  });
  assert.equal(source.sourceKey, 'drive:FILE_X');

  const version = createSourceVersion({
    sourceKey: source.sourceKey,
    versionId: 'md5:ABC',
    fingerprintType: 'md5',
    fingerprintValue: 'ABC',
    observedAt: '2026-09-27T00:00:00Z',
  });
  assert.equal(version.sourceVersionKey, 'drive:FILE_X@md5:ABC');
});

test('context supports explicit unclassified state', () => {
  const context = createContext({
    contextId: 'internal:unclassified',
    contextKind: 'unclassified',
    label: 'Unclassified',
  });
  assert.equal(context.contextKind, 'unclassified');
});

test('context binding confidence is bounded', () => {
  assert.throws(() => createContextBinding({
    sourceKey: 'drive:FILE_X',
    contextId: 'ctx:1',
    scope: 'session',
    bindingMethod: 'rule_inferred',
    confidence: 1.5,
  }));
});

test('authorization is explicit and source-scoped', () => {
  const auth = createProcessingAuthorization({
    subjectKey: 'drive:FILE_X',
    authorizationState: 'AUTHORIZED',
    privacyClass: 'SOURCE_PRIVATE',
    allowedProcessing: ['transcription'],
    updatedAt: '2026-09-27T00:00:00Z',
  });
  assert.deepEqual(auth.allowedProcessing, ['transcription']);
});

test('artifact identity is stable for same semantic generation key', () => {
  const base = {
    artifactType: 'TRANSCRIPT',
    sourceVersionKey: 'drive:FILE_X@md5:ABC',
    locator: 'artifact:ART_X',
    contentType: 'text/markdown',
    processorName: 'audio_transcript',
    processorVersion: '1',
    createdAt: '2026-09-27T00:00:00Z',
  };
  assert.equal(createArtifact(base).artifactId, createArtifact(base).artifactId);
});
