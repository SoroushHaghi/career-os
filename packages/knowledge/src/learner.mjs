import { deterministicId } from '../../core/src/identities.mjs';

export const LearnerStates = Object.freeze([
  'UNKNOWN',
  'EXPOSED',
  'PARTIAL',
  'UNDERSTOOD',
  'STRONG',
  'WEAK',
  'CONFUSED',
  'NEEDS_PREREQUISITE',
]);

export function createLearnerObservation({
  subjectId,
  knowledgeId,
  state,
  confidence = 0,
  observedAt,
  evidenceRefs = [],
  provenance = null,
  notes = null,
}) {
  if (!LearnerStates.includes(state)) throw new TypeError(`unsupported learner state: ${state}`);
  const numericConfidence = Number(confidence);
  if (!Number.isFinite(numericConfidence) || numericConfidence < 0 || numericConfidence > 1) {
    throw new TypeError('confidence must be between 0 and 1');
  }
  const observationId = deterministicId(
    'learner-observation',
    subjectId,
    knowledgeId,
    state,
    observedAt,
    evidenceRefs.join('|')
  );
  return {
    observationId,
    subjectId: String(subjectId),
    knowledgeId: String(knowledgeId),
    state,
    confidence: numericConfidence,
    observedAt: String(observedAt),
    evidenceRefs: [...new Set(evidenceRefs.map(String))],
    provenance,
    notes,
  };
}

export function buildLearnerState({
  subjectId,
  knowledgeId,
  observations = [],
  prerequisiteGaps = [],
  nextAction = null,
}) {
  const relevant = observations
    .filter((o) => o.subjectId === subjectId && o.knowledgeId === knowledgeId)
    .sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));

  const latest = relevant.at(-1) ?? null;

  return {
    learnerStateId: deterministicId('learner-state', subjectId, knowledgeId),
    subjectId,
    knowledgeId,
    state: latest?.state ?? 'UNKNOWN',
    confidence: latest?.confidence ?? 0,
    observations: relevant,
    evidenceRefs: [...new Set(relevant.flatMap((o) => o.evidenceRefs ?? []))],
    lastObserved: latest?.observedAt ?? null,
    prerequisiteGaps: [...new Set(prerequisiteGaps.map(String))],
    nextAction,
  };
}

export function selectRelevantLearnerStates(states, knowledgeIds) {
  const wanted = new Set(knowledgeIds.map(String));
  return states.filter((state) => wanted.has(String(state.knowledgeId)));
}
