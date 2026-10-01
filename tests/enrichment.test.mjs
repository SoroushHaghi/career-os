import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnrichmentRequest,
  normalizeEnrichmentResult,
  validateEnrichmentEvidenceRefs,
} from '../packages/knowledge/src/enrichment.mjs';

test('enrichment request contains only bounded evidence bundle', () => {
  const request = buildEnrichmentRequest({
    context: { contextId: 'ctx:1', label: 'Session 1', contextKind: 'session' },
    evidenceBundle: {
      evidence: [
        { evidenceId: 'E1', content: 'alpha', modality: 'text', sourceVersionKey: 'S@1' },
      ],
    },
  });
  assert.deepEqual(request.evidenceIds, ['E1']);
  assert.equal(request.evidence.length, 1);
});

test('unknown evidence refs invalidate semantic result', () => {
  const result = normalizeEnrichmentResult({
    topics: [{ label: 'A', evidenceIds: ['E1', 'E2'] }],
  });
  const validation = validateEnrichmentEvidenceRefs(result, ['E1']);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.unknownEvidenceIds, ['E2']);
});

test('empty optional enrichment arrays normalize safely', () => {
  const result = normalizeEnrichmentResult({});
  assert.deepEqual(result.topics, []);
  assert.deepEqual(result.relations, []);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.promotionCandidates, []);
});
