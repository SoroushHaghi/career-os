import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegistryProjection, parseJsonl, toJsonl } from '../packages/persistence/src/registry-projections.mjs';

test('jsonl is deterministic', () => {
  const text = toJsonl([{ sourceKey: 'b' }, { sourceKey: 'a' }], { sortKey: 'sourceKey' });
  assert.deepEqual(parseJsonl(text).map((x) => x.sourceKey), ['a', 'b']);
});

test('registry projection exposes counts', () => {
  const result = buildRegistryProjection({
    generatedAt: '2026-09-27T00:00:00Z',
    context: { contextId: 'ctx:sample', contextKind: 'session', label: 'Sample' },
    sources: [{ sourceKey: 'drive:F1' }],
    artifacts: [{ artifactId: 'artifact:A1' }],
    evidence: [{ evidenceId: 'evidence:E1' }],
    processing: [{ processingId: 'processing:P1', status: 'SUCCEEDED' }],
  });
  assert.equal(result.manifest.counts.sources, 1);
  assert.equal(result.manifest.processingByStatus.SUCCEEDED, 1);
});
