import { normalizeSessionSynthesis, validateSessionSynthesis } from './compiler.mjs';

export const TopicVerificationVerdicts = Object.freeze([
  'VERIFIED',
  'VERIFIED_WITH_QUALIFICATION',
  'NOT_VERIFIED',
  'CONTRADICTED',
  'UNABLE_TO_VERIFY',
]);

export const SELECTIVE_VERIFICATION_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',
  required: ['verdicts', 'warnings'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['topic_index', 'verdict', 'checked_evidence_refs'],
        properties: {
          topic_index: { type: 'integer' },
          verdict: { type: 'string', enum: TopicVerificationVerdicts },
          rationale: { type: 'string' },
          checked_evidence_refs: {
            type: 'array',
            items: { type: 'string' },
          },
          qualifications: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
});

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function uniqueStrings(values = []) {
  return [...new Set((values ?? []).map(String).filter(Boolean))];
}

export function buildSelectiveVerificationRequest({
  bundle,
  synthesis,
  context = null,
} = {}) {
  const validation = validateSessionSynthesis({ synthesis, bundle });
  if (!validation.valid) {
    throw new TypeError('synthesis must pass structural/evidence validation before verification');
  }

  const normalized = validation.synthesis;
  const byId = new Map((bundle.evidence ?? []).map((item) => [String(item.evidenceId), item]));

  const topics = normalized.topicBlocks.map((topic, index) => {
    const evidence = topic.evidenceRefs.map((ref) => {
      const item = byId.get(String(ref));
      if (!item) {
        throw new TypeError(`missing evidence body for verification ref: ${ref}`);
      }
      return {
        evidenceId: item.evidenceId,
        content: item.content ?? null,
        modality: item.modality ?? null,
        anchor: item.anchor ?? null,
        sourceVersionKey: item.sourceVersionKey ?? null,
      };
    });

    return {
      topicIndex: index,
      title: topic.title,
      explanation: topic.explanation,
      definitions: topic.definitions,
      formulas: topic.formulas,
      examples: topic.examples,
      lecturerEmphasis: topic.lecturerEmphasis,
      synthesisUncertainties: topic.uncertainties,
      evidenceRefs: topic.evidenceRefs,
      evidence,
    };
  });

  return {
    schemaVersion: '0.1',
    bundleId: bundle.bundleId,
    context: context
      ? {
          contextId: context.contextId ?? bundle.contextId ?? null,
          label: context.label ?? null,
          contextKind: context.contextKind ?? null,
        }
      : { contextId: bundle.contextId ?? null },
    instructions: [
      'Verify each synthesized topic only against its cited evidence.',
      'Do not rewrite the synthesis.',
      'Return one verdict for every topicIndex.',
      'Use VERIFIED only when the material explanation is fully supported.',
      'Use VERIFIED_WITH_QUALIFICATION when support is substantially correct but needs an explicit qualifier.',
      'Use NOT_VERIFIED when evidence is insufficient, CONTRADICTED when evidence conflicts, and UNABLE_TO_VERIFY when evidence is unusable.',
      'checked_evidence_refs must be a subset of that topic evidence_refs.',
    ],
    topics,
  };
}

export function normalizeSelectiveVerificationResult(result = {}) {
  return {
    verdicts: Array.isArray(result.verdicts)
      ? result.verdicts.map((item) => ({
          topicIndex: Number(item.topic_index ?? item.topicIndex),
          verdict: String(item.verdict ?? '').toUpperCase(),
          rationale: item.rationale == null ? null : String(item.rationale),
          checkedEvidenceRefs: uniqueStrings(
            item.checked_evidence_refs ?? item.checkedEvidenceRefs ?? []
          ),
          qualifications: uniqueStrings(item.qualifications ?? []),
        }))
      : [],
    warnings: uniqueStrings(result.warnings ?? []),
  };
}

export function validateSelectiveVerificationResult({
  result,
  synthesis,
  bundle,
} = {}) {
  const synthesisValidation = validateSessionSynthesis({ synthesis, bundle });
  if (!synthesisValidation.valid) {
    throw new TypeError('synthesis must be valid before verification result validation');
  }

  const normalized = normalizeSelectiveVerificationResult(result);
  const topics = synthesisValidation.synthesis.topicBlocks;
  const seen = new Set();
  const errors = [];

  for (const verdict of normalized.verdicts) {
    if (!Number.isInteger(verdict.topicIndex) || verdict.topicIndex < 0 || verdict.topicIndex >= topics.length) {
      errors.push({ code: 'INVALID_TOPIC_INDEX', topicIndex: verdict.topicIndex });
      continue;
    }
    if (seen.has(verdict.topicIndex)) {
      errors.push({ code: 'DUPLICATE_TOPIC_VERDICT', topicIndex: verdict.topicIndex });
      continue;
    }
    seen.add(verdict.topicIndex);

    if (!TopicVerificationVerdicts.includes(verdict.verdict)) {
      errors.push({
        code: 'INVALID_VERDICT',
        topicIndex: verdict.topicIndex,
        verdict: verdict.verdict,
      });
    }

    const allowed = new Set(topics[verdict.topicIndex].evidenceRefs.map(String));
    for (const ref of verdict.checkedEvidenceRefs) {
      if (!allowed.has(ref)) {
        errors.push({
          code: 'VERIFICATION_REF_OUTSIDE_TOPIC',
          topicIndex: verdict.topicIndex,
          evidenceRef: ref,
        });
      }
    }

    if (
      ['VERIFIED', 'VERIFIED_WITH_QUALIFICATION'].includes(verdict.verdict) &&
      verdict.checkedEvidenceRefs.length === 0
    ) {
      errors.push({
        code: 'POSITIVE_VERDICT_WITHOUT_CHECKED_EVIDENCE',
        topicIndex: verdict.topicIndex,
      });
    }

    if (
      verdict.verdict === 'VERIFIED_WITH_QUALIFICATION' &&
      verdict.qualifications.length === 0
    ) {
      errors.push({
        code: 'QUALIFIED_VERDICT_WITHOUT_QUALIFICATION',
        topicIndex: verdict.topicIndex,
      });
    }
  }

  for (let i = 0; i < topics.length; i += 1) {
    if (!seen.has(i)) {
      errors.push({ code: 'MISSING_TOPIC_VERDICT', topicIndex: i });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    verification: normalized,
  };
}

export function summarizeVerificationState({
  result,
  synthesis,
  bundle,
} = {}) {
  const validation = validateSelectiveVerificationResult({
    result,
    synthesis,
    bundle,
  });

  if (!validation.valid) {
    return {
      status: 'INVALID_VERIFICATION_RESULT',
      promotable: false,
      reviewRequired: true,
      errors: validation.errors,
      verification: validation.verification,
    };
  }

  const verdicts = validation.verification.verdicts;
  if (verdicts.some((item) => item.verdict === 'CONTRADICTED')) {
    return {
      status: 'CONTRADICTED',
      promotable: false,
      reviewRequired: true,
      errors: [],
      verification: validation.verification,
    };
  }
  if (verdicts.some((item) => ['NOT_VERIFIED', 'UNABLE_TO_VERIFY'].includes(item.verdict))) {
    return {
      status: 'NOT_VERIFIED',
      promotable: false,
      reviewRequired: true,
      errors: [],
      verification: validation.verification,
    };
  }
  if (verdicts.some((item) => item.verdict === 'VERIFIED_WITH_QUALIFICATION')) {
    return {
      status: 'VERIFIED_WITH_QUALIFICATION',
      promotable: false,
      reviewRequired: true,
      errors: [],
      verification: validation.verification,
    };
  }

  return {
    status: 'VERIFIED',
    promotable: false,
    reviewRequired: false,
    errors: [],
    verification: validation.verification,
  };
}
