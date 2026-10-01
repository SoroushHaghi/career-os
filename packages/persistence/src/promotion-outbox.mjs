export function buildPromotionOutbox({
  contextId,
  candidates = [],
  generatedAt,
}) {
  if (!contextId) throw new TypeError('contextId is required');
  if (!generatedAt) throw new TypeError('generatedAt is required');

  return {
    schemaVersion: '0.1',
    contextId: String(contextId),
    generatedAt: String(generatedAt),
    candidates: candidates.map((candidate) => ({
      candidateId: candidate.candidateId ?? null,
      kind: candidate.kind,
      evidenceState: candidate.evidenceState ?? 'UNKNOWN',
      evidenceRefs: [...new Set((candidate.evidenceRefs ?? []).map(String))],
      provenance: candidate.provenance ?? null,
      highImpact: Boolean(candidate.highImpact),
      privateDestination: 'career-memory',
    })),
  };
}

export function serializePromotionOutbox(outbox) {
  return JSON.stringify(outbox, null, 2) + '\n';
}

export function pendingPromotionCandidates(outbox) {
  return (outbox?.candidates ?? []).filter(
    (candidate) => candidate.privateDestination === 'career-memory'
  );
}
