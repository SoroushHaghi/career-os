import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCompilerEvidenceBundle,
  buildSessionSynthesisPrompt,
  isGeneratedKnowledgeArtifact,
  normalizeSessionSynthesis,
  renderSessionSynthesisMarkdown,
  selectCompilationEvidence,
  synthesisToClaims,
  validateSessionSynthesis,
} from '../packages/knowledge/src/compiler.mjs';
import {
  compareSynthesisCandidates,
  evaluateSessionSynthesisQuality,
} from '../packages/knowledge/src/quality.mjs';

const artifacts = [
  {
    artifactId: 'AUDIO1',
    sourceVersionKey: 'v:audio:1',
    name: 'lecture-transcript.txt',
    modality: 'audio',
    anchor: { startSeconds: 0, endSeconds: 180 },
    content:
      'Hermitian operators have real eigenvalues. The lecturer repeats that observables use Hermitian operators. [ASR unclear] a phrase is garbled.',
  },
  {
    artifactId: 'SLIDE1',
    sourceVersionKey: 'v:slide:1',
    name: 'slides-ocr.txt',
    modality: 'image',
    anchor: { page: 8 },
    content:
      'Hermitian: H dagger equals H. Eigenvalues are real. Unitary: U dagger U equals identity.',
  },
  {
    artifactId: 'NOTE1',
    sourceVersionKey: 'v:note:1',
    name: 'student-notes.txt',
    modality: 'text',
    anchor: { line: 12 },
    content:
      'Observable -> Hermitian matrix. Unitary transformations preserve norm.',
  },
];

test('generated knowledge artifacts self-exclude', () => {
  assert.equal(
    isGeneratedKnowledgeArtifact({ name: 'SESSION_SYNTHESIS.md' }),
    true
  );
  assert.equal(
    isGeneratedKnowledgeArtifact({ kind: 'knowledge_synthesis', name: 'x.json' }),
    true
  );
  assert.equal(
    isGeneratedKnowledgeArtifact({ name: 'lecture-transcript.txt' }),
    false
  );
});

test('bounded evidence selection preserves multiple sources and reports truncation', () => {
  const selected = selectCompilationEvidence({
    artifacts: [
      ...artifacts,
      {
        artifactId: 'SYN1',
        sourceVersionKey: 'v:syn:1',
        name: 'SESSION_SYNTHESIS.md',
        content: 'must not feed back into itself',
      },
    ],
    maxChars: 120,
  });

  assert.equal(selected.evidence.length, 3);
  assert.ok(selected.coverage.selectedChars <= 120);
  assert.ok(selected.coverage.truncatedEvidenceIds.length > 0);
  assert.ok(
    selected.exclusions.some(
      (item) => item.reason === 'GENERATED_ARTIFACT_SELF_EXCLUDED'
    )
  );
});

test('compiler bundle keeps source identity and coverage', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
    maxChars: 1000,
  });
  assert.deepEqual(bundle.evidenceIds, ['AUDIO1', 'SLIDE1', 'NOTE1']);
  assert.equal(bundle.coverage.selectedArtifactCount, 3);
  assert.equal(bundle.evidence[1].anchor.page, 8);
});

test('compiler prompt requests fusion rather than concatenation', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const prompt = buildSessionSynthesisPrompt({
    context: {
      contextId: 'ctx:session:1',
      contextKind: 'session',
      label: 'Quantum Session 1',
    },
    bundle,
  });

  assert.match(prompt.systemInstruction, /Fuse overlapping explanations/i);
  assert.match(prompt.userPrompt, /merge duplicates/i);
  assert.match(prompt.userPrompt, /AUDIO1/);
  assert.match(prompt.userPrompt, /SLIDE1/);
  assert.ok(prompt.responseSchema.properties.topic_blocks);
});

const fusedSynthesis = {
  title: 'Linear Algebra Foundations for Quantum Mechanics',
  executive_summary:
    'The session connects Hermitian operators to observables and unitary operators to norm-preserving evolution.',
  topic_blocks: [
    {
      title: 'Hermitian operators',
      explanation:
        'The lecturer defines a Hermitian operator by H† = H and emphasizes that its eigenvalues are real, which supports its use for observables.',
      definitions: ['Hermitian operator: H† = H.'],
      formulas: ['H† = H'],
      examples: [],
      lecturer_emphasis: ['Observables are represented by Hermitian operators.'],
      evidence_refs: ['AUDIO1', 'SLIDE1', 'NOTE1'],
      uncertainties: [
        'One nearby phrase in the audio transcript is garbled and is not used to extend the claim.',
      ],
    },
    {
      title: 'Unitary operators',
      explanation:
        'A unitary operator satisfies U†U = I and preserves vector norm.',
      definitions: ['Unitary operator: U†U = I.'],
      formulas: ['U†U = I'],
      examples: [],
      lecturer_emphasis: [],
      evidence_refs: ['SLIDE1', 'NOTE1'],
      uncertainties: [],
    },
  ],
  uncertainties: [
    {
      text: 'The audio contains one garbled ASR segment.',
      evidence_refs: ['AUDIO1'],
    },
  ],
  conflicts: [],
  coverage: {
    summary: 'All three eligible evidence units were used.',
    included_evidence_refs: ['AUDIO1', 'SLIDE1', 'NOTE1'],
    excluded_evidence_refs: [],
  },
};

test('synthetic multi-source output represents actual fusion with one topic using several sources', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const validation = validateSessionSynthesis({
    synthesis: fusedSynthesis,
    bundle,
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.synthesis.topicBlocks.length, 2);
  assert.deepEqual(
    validation.synthesis.topicBlocks[0].evidenceRefs,
    ['AUDIO1', 'SLIDE1', 'NOTE1']
  );
});

test('unknown evidence references are rejected', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const invalid = structuredClone(fusedSynthesis);
  invalid.topic_blocks[0].evidence_refs.push('MADE_UP_SOURCE');

  const validation = validateSessionSynthesis({
    synthesis: invalid,
    bundle,
  });
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.unknownEvidenceRefs, ['MADE_UP_SOURCE']);
});

test('uncertainty is preserved into normalized synthesis and claims', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const normalized = normalizeSessionSynthesis(fusedSynthesis);
  assert.match(normalized.uncertainties[0].text, /garbled ASR/i);

  const claims = synthesisToClaims({
    synthesis: fusedSynthesis,
    bundle,
    synthesisRunId: 'run:1',
  });
  assert.equal(claims.valid, true);
  assert.equal(claims.claims[0].supportStatus, 'PARTIALLY_SUPPORTED');
  assert.match(claims.claims[0].uncertainties[0], /garbled/i);
});

test('markdown renderer produces human-usable structured output with evidence refs', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const md = renderSessionSynthesisMarkdown({
    synthesis: fusedSynthesis,
    bundle,
  });
  assert.match(md, /## Hermitian operators/);
  assert.match(md, /### Evidence/);
  assert.match(md, /AUDIO1/);
  assert.match(md, /## Global Uncertainties/);
});

test('quality gate rewards grounded fusion and uncertainty preservation', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const quality = evaluateSessionSynthesisQuality({
    synthesis: fusedSynthesis,
    bundle,
  });

  assert.equal(quality.pass, true);
  assert.equal(quality.metrics.referenceIntegrity, 1);
  assert.equal(quality.metrics.topicEvidenceCoverage, 1);
  assert.equal(quality.metrics.uncertaintyHandling, 1);
  assert.equal(quality.failures.length, 0);
});

test('candidate comparison detects a better structured synthesis', () => {
  const bundle = buildCompilerEvidenceBundle({
    contextId: 'ctx:session:1',
    artifacts,
    privacyDecisionId: 'privacy:allow:test',
  });
  const weak = {
    title: 'Notes',
    executive_summary: 'Hermitian operators.',
    topic_blocks: [
      {
        title: 'Hermitian',
        explanation: 'Hermitian operators.',
        evidence_refs: ['AUDIO1'],
      },
    ],
    uncertainties: [],
    conflicts: [],
    coverage: { summary: 'Partial.', included_evidence_refs: ['AUDIO1'] },
  };
  const comparison = compareSynthesisCandidates({
    baseline: weak,
    candidate: fusedSynthesis,
    bundle,
  });
  assert.equal(comparison.improved, true);
  assert.ok(comparison.delta > 0);
});
