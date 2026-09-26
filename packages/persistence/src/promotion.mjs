const DURABLE_KINDS = new Set([
  'durable_fact',
  'project_outcome',
  'skill_evidence',
  'learner_pattern',
  'course_summary',
  'project_summary',
  'decision',
  'status_change',
]);

export function evaluatePromotionCandidate(candidate = {}) {
  const reasons = [];

  if (!DURABLE_KINDS.has(candidate.kind)) reasons.push('kind_not_allowlisted');
  if (!candidate.provenance) reasons.push('missing_provenance');
  if (candidate.private === false && candidate.containsPersonalData) reasons.push('personal_data_public_destination');
  if (candidate.rawMedia === true) reasons.push('raw_media_not_promotable');
  if (candidate.fullTranscript === true) reasons.push('full_transcript_not_default_memory');

  const evidenceState = candidate.evidenceState ?? 'UNKNOWN';
  if (!['SOURCE_SUPPORTED','USER_CONFIRMED','VERIFIED','INFERRED'].includes(evidenceState)) {
    reasons.push('unsupported_evidence_state');
  }

  return {
    promotable: reasons.length === 0,
    reasons,
    destination: candidate.private === false ? null : 'career-memory',
    reviewRequired: evidenceState === 'INFERRED' || Boolean(candidate.highImpact),
  };
}

export function buildPromotionRecord(candidate, decision) {
  return {
    candidateId: candidate.candidateId ?? null,
    kind: candidate.kind,
    destination: decision.destination,
    promotable: decision.promotable,
    reviewRequired: decision.reviewRequired,
    reasons: decision.reasons,
    provenance: candidate.provenance ?? null,
  };
}
