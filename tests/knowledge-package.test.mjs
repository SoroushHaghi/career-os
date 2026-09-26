import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgePackage } from '../packages/knowledge/src/package.mjs';

test('knowledge package references evidence instead of flattening sources', () => {
  const pkg = buildKnowledgePackage({
    context: { contextId: 'ctx:1', contextKind: 'session', label: 'Session 1' },
    sources: [{ sourceKey: 'drive:F1' }],
    evidence: [
      { evidenceId: 'E1', topicKey: 'topic-a', topicLabel: 'Topic A', modality: 'text', contextIds: ['ctx:1'] },
      { evidenceId: 'E2', topicKey: 'topic-a', topicLabel: 'Topic A', modality: 'audio', contextIds: ['ctx:1'] },
    ],
  });
  assert.deepEqual(pkg.sourceKeys, ['drive:F1']);
  assert.deepEqual(pkg.evidenceIds, ['E1', 'E2']);
  assert.equal(pkg.concepts.length, 1);
});
