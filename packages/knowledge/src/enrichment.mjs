export function buildEnrichmentRequest({
  context,
  evidenceBundle,
  existingProfile = null,
}) {
  if (!context?.contextId) throw new TypeError('context.contextId is required');
  if (!evidenceBundle || !Array.isArray(evidenceBundle.evidence)) {
    throw new TypeError('evidenceBundle.evidence is required');
  }

  return {
    schemaVersion: '0.1',
    context: {
      contextId: context.contextId,
      label: context.label ?? null,
      contextKind: context.contextKind ?? null,
    },
    evidenceIds: evidenceBundle.evidence
      .map((item) => item.evidenceId)
      .filter(Boolean),
    evidence: evidenceBundle.evidence.map((item) => ({
      evidenceId: item.evidenceId,
      content: item.content ?? null,
      modality: item.modality ?? null,
      anchor: item.anchor ?? null,
      sourceVersionKey: item.sourceVersionKey ?? null,
    })),
    existingProfile,
  };
}

export function normalizeEnrichmentResult(result = {}) {
  return {
    topics: Array.isArray(result.topics) ? result.topics : [],
    relations: Array.isArray(result.relations) ? result.relations : [],
    conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
    promotionCandidates: Array.isArray(result.promotionCandidates)
      ? result.promotionCandidates
      : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
  };
}

export function validateEnrichmentEvidenceRefs(result, allowedEvidenceIds) {
  const allowed = new Set((allowedEvidenceIds ?? []).map(String));
  const unknown = [];

  const collect = (refs) => {
    for (const ref of refs ?? []) {
      if (!allowed.has(String(ref))) unknown.push(String(ref));
    }
  };

  for (const topic of result.topics ?? []) collect(topic.evidenceIds);
  for (const relation of result.relations ?? []) collect(relation.evidenceIds);
  for (const conflict of result.conflicts ?? []) collect(conflict.evidenceIds);

  return {
    valid: unknown.length === 0,
    unknownEvidenceIds: [...new Set(unknown)].sort(),
  };
}
