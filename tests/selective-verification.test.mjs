import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCompilerEvidenceBundle } from '../packages/knowledge/src/compiler.mjs';
import {
  buildSelectiveVerificationRequest,
  summarizeVerificationState,
  validateSelectiveVerificationResult,
} from '../packages/knowledge/src/selective-verification.mjs';

const artifacts = [
  {
    artifactId: 'A1',
    sourceVersionKey: 'v1',
    name: 'transcript.txt',
    modality: 'audio',
    content: 'Hermitian operators have real eigenvalues.',
  },
  {
    artifactId: 'A2',
    sourceVersionKey: 'v2',
    name: 'notes.txt',
    modality: 'text',
    content: 'Unitary operators preserve vector norm.',
  },
];

const synthesis = {
  title: 'Session',
  executive_summary: 'Two operator properties.',
  topic_blocks: [
    {
      title: 'Hermitian',
      explanation: 'Hermitian operators have real eigenvalues.',
      evidence_refs: ['A1'],
      definitions: [],
      formulas: [],
      examples: [],
      lecturer_emphasis: [],
      uncertainties: [],
    },
    {
      title: 'Unitary',
      explanation: 'Unitary operators preserve vector norm.',
      evidence_refs: ['A2'],
      definitions: [],
      formulas: [],
      examples: [],
      lecturer_emphasis: [],
      uncertainties: [],
    },
  ],
  uncertainties: [],
  conflicts: [],
  coverage: {
    summary: 'All evidence used.',
    included_evidence_refs: ['A1', 'A2'],
    excluded_evidence_refs: [],
  },
};

function bundle() {
  return buildCompilerEvidenceBundle({
    contextId: 'ctx:1',
    artifacts,
    privacyDecisionId: 'privacy:test',
  });
}

test('selective verification request includes only topic-cited evidence', () => {
  const request = buildSelectiveVerificationRequest({
    bundle: bundle(),
    synthesis,
    context: { contextId: 'ctx:1', label: 'Session 1', contextKind: 'session' },
  });
  assert.equal(request.topics.length, 2);
  assert.deepEqual(request.topics[0].evidenceRefs, ['A1']);
  assert.deepEqual(request.topics[0].evidence.map((x) => x.evidenceId), ['A1']);
  assert.deepEqual(request.topics[1].evidence.map((x) => x.evidenceId), ['A2']);
});

test('verification rejects refs outside a topic evidence set', () => {
  const result = {
    verdicts: [
      {
        topic_index: 0,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A2'],
      },
      {
        topic_index: 1,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A2'],
      },
    ],
  };
  const validation = validateSelectiveVerificationResult({
    result,
    synthesis,
    bundle: bundle(),
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) => error.code === 'VERIFICATION_REF_OUTSIDE_TOPIC')
  );
});

test('verification requires one verdict per material topic', () => {
  const result = {
    verdicts: [
      {
        topic_index: 0,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A1'],
      },
    ],
  };
  const validation = validateSelectiveVerificationResult({
    result,
    synthesis,
    bundle: bundle(),
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some(
      (error) => error.code === 'MISSING_TOPIC_VERDICT' && error.topicIndex === 1
    )
  );
});

test('all verified topics produce VERIFIED state but remain non-promotable', () => {
  const result = {
    verdicts: [
      {
        topic_index: 0,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A1'],
        rationale: 'Directly supported.',
      },
      {
        topic_index: 1,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A2'],
        rationale: 'Directly supported.',
      },
    ],
    warnings: [],
  };
  const state = summarizeVerificationState({
    result,
    synthesis,
    bundle: bundle(),
  });
  assert.equal(state.status, 'VERIFIED');
  assert.equal(state.reviewRequired, false);
  assert.equal(state.promotable, false);
});

test('qualified verification forces review and keeps qualification', () => {
  const result = {
    verdicts: [
      {
        topic_index: 0,
        verdict: 'VERIFIED_WITH_QUALIFICATION',
        checked_evidence_refs: ['A1'],
        qualifications: ['Evidence supports the eigenvalue claim only.'],
      },
      {
        topic_index: 1,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A2'],
      },
    ],
  };
  const state = summarizeVerificationState({
    result,
    synthesis,
    bundle: bundle(),
  });
  assert.equal(state.status, 'VERIFIED_WITH_QUALIFICATION');
  assert.equal(state.reviewRequired, true);
  assert.equal(state.promotable, false);
});

test('contradicted topic dominates final verification state', () => {
  const result = {
    verdicts: [
      {
        topic_index: 0,
        verdict: 'CONTRADICTED',
        checked_evidence_refs: ['A1'],
      },
      {
        topic_index: 1,
        verdict: 'VERIFIED',
        checked_evidence_refs: ['A2'],
      },
    ],
  };
  const state = summarizeVerificationState({
    result,
    synthesis,
    bundle: bundle(),
  });
  assert.equal(state.status, 'CONTRADICTED');
  assert.equal(state.reviewRequired, true);
});
