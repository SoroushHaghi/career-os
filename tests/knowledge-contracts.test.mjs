import test from 'node:test';
import assert from 'node:assert/strict';
import { createKnowledgeEntity, createKnowledgeRelation } from '../packages/core/src/knowledge-contracts.mjs';
import { createProvenance } from '../packages/core/src/provenance.mjs';

test('knowledge entity id is stable for normalized key', () => {
  const a = createKnowledgeEntity({ knowledgeType: 'Concept', label: 'Quantum Fourier Transform' });
  const b = createKnowledgeEntity({ knowledgeType: 'Concept', label: 'Quantum Fourier Transform' });
  assert.equal(a.knowledgeId, b.knowledgeId);
});

test('knowledge relation preserves evidence refs', () => {
  const rel = createKnowledgeRelation({
    sourceKnowledgeId: 'knowledge:A',
    relationType: 'EXPLAINS',
    targetKnowledgeId: 'knowledge:B',
    evidenceIds: ['E2', 'E1', 'E1'],
  });
  assert.deepEqual(rel.evidenceIds, ['E1', 'E2']);
});

test('provenance requires origin and timestamp', () => {
  assert.throws(() => createProvenance({}));
  const p = createProvenance({
    originType: 'DETERMINISTIC_EXTRACTION',
    createdAt: '2026-09-27T00:00:00Z',
    sourceRefs: ['drive:F1'],
  });
  assert.equal(p.originType, 'DETERMINISTIC_EXTRACTION');
});
