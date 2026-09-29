import { normalizeSessionSynthesis, validateSessionSynthesis } from './compiler.mjs';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateRatio(values) {
  const normalized = values.map(normalizeText).filter(Boolean);
  if (!normalized.length) return 0;
  return 1 - new Set(normalized).size / normalized.length;
}

export function evaluateSessionSynthesisQuality({
  synthesis,
  bundle,
} = {}) {
  const validation = validateSessionSynthesis({ synthesis, bundle });
  const normalized = validation.synthesis;
  const allowed = new Set(bundle?.evidenceIds?.map(String) ?? []);

  const referenced = new Set();
  for (const topic of normalized.topicBlocks) {
    for (const ref of topic.evidenceRefs) {
      if (allowed.has(ref)) referenced.add(ref);
    }
  }

  const evidenceCoverage =
    allowed.size === 0 ? 0 : referenced.size / allowed.size;

  const topicEvidenceCoverage =
    normalized.topicBlocks.length === 0
      ? 0
      : normalized.topicBlocks.filter((topic) => topic.evidenceRefs.length > 0)
          .length / normalized.topicBlocks.length;

  const topicTitles = normalized.topicBlocks.map((topic) => topic.title);
  const explanations = normalized.topicBlocks.map((topic) => topic.explanation);
  const duplicationPenalty = Math.max(
    duplicateRatio(topicTitles),
    duplicateRatio(explanations)
  );

  const uncertaintySignals =
    normalized.uncertainties.length +
    normalized.topicBlocks.reduce(
      (sum, topic) => sum + topic.uncertainties.length,
      0
    );
  const suspiciousInput =
    (bundle?.coverage?.truncatedEvidenceIds?.length ?? 0) > 0 ||
    (bundle?.evidence ?? []).some((item) =>
      /\b(?:unclear|inaudible|ocr|asr|\?\?\?|garbled|corrupt)\b/i.test(
        String(item.content ?? '')
      )
    );
  const uncertaintyHandling = suspiciousInput
    ? uncertaintySignals > 0
      ? 1
      : 0
    : 1;

  const structureCompleteness =
    [
      normalized.title,
      normalized.executiveSummary,
      normalized.topicBlocks.length > 0,
      normalized.coverage.summary,
    ].filter(Boolean).length / 4;

  const referenceIntegrity =
    validation.unknownEvidenceRefs.length === 0 ? 1 : 0;

  const score = clamp01(
    0.25 * referenceIntegrity +
      0.2 * topicEvidenceCoverage +
      0.2 * evidenceCoverage +
      0.15 * structureCompleteness +
      0.1 * uncertaintyHandling +
      0.1 * (1 - duplicationPenalty)
  );

  const failures = [];
  if (!validation.valid) failures.push('SCHEMA_OR_REFERENCE_VALIDATION_FAILED');
  if (referenceIntegrity < 1) failures.push('UNKNOWN_EVIDENCE_REFERENCE');
  if (topicEvidenceCoverage < 1) failures.push('TOPIC_WITHOUT_EVIDENCE');
  if (evidenceCoverage < 0.5) failures.push('LOW_EVIDENCE_COVERAGE');
  if (duplicationPenalty > 0) failures.push('DUPLICATE_SYNTHESIS_CONTENT');
  if (uncertaintyHandling < 1) failures.push('UNCERTAINTY_NOT_PRESERVED');
  if (structureCompleteness < 1) failures.push('INCOMPLETE_STRUCTURE');

  return {
    score,
    pass: validation.valid && score >= 0.8 && failures.length === 0,
    metrics: {
      referenceIntegrity,
      topicEvidenceCoverage,
      evidenceCoverage,
      structureCompleteness,
      uncertaintyHandling,
      duplicationPenalty,
    },
    failures,
    validationErrors: validation.errors,
  };
}

export function compareSynthesisCandidates({
  baseline,
  candidate,
  bundle,
} = {}) {
  const baselineQuality = evaluateSessionSynthesisQuality({
    synthesis: baseline,
    bundle,
  });
  const candidateQuality = evaluateSessionSynthesisQuality({
    synthesis: candidate,
    bundle,
  });

  return {
    baseline: baselineQuality,
    candidate: candidateQuality,
    delta: candidateQuality.score - baselineQuality.score,
    improved: candidateQuality.score > baselineQuality.score,
  };
}
