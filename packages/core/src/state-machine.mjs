export const SourceVersionStates = Object.freeze(['DETECTED','AUTHORIZED','REGISTERED','BLOCKED_POLICY','RETIRED']);
export const ProcessingJobStates = Object.freeze(['PLANNED','QUEUED','RUNNING','RETRY_WAIT','SUCCEEDED','SKIPPED_CURRENT','FAILED_RETRYABLE','FAILED_FINAL','CANCELLED']);
export const ArtifactStates = Object.freeze(['AVAILABLE','STALE','INCOMPLETE','INVALID','SUPERSEDED']);
export const EnrichmentStates = Object.freeze(['NOT_REQUESTED','PENDING','RUNNING','READY','PARTIAL','FAILED_RETRYABLE','FAILED_FINAL']);
export const PromotionStates = Object.freeze(['NOT_CANDIDATE','CANDIDATE','PENDING_REVIEW_OR_POLICY','PROMOTED','REJECTED','SUPERSEDED']);

const transitions = Object.freeze({
  source: {
    DETECTED: ['AUTHORIZED','BLOCKED_POLICY','RETIRED'],
    AUTHORIZED: ['REGISTERED','BLOCKED_POLICY','RETIRED'],
    REGISTERED: ['BLOCKED_POLICY','RETIRED'],
    BLOCKED_POLICY: ['AUTHORIZED','RETIRED'],
    RETIRED: [],
  },
  job: {
    PLANNED: ['QUEUED','SKIPPED_CURRENT','CANCELLED'],
    QUEUED: ['RUNNING','CANCELLED'],
    RUNNING: ['SUCCEEDED','RETRY_WAIT','FAILED_RETRYABLE','FAILED_FINAL','CANCELLED'],
    RETRY_WAIT: ['QUEUED','RUNNING','FAILED_FINAL','CANCELLED'],
    FAILED_RETRYABLE: ['RETRY_WAIT','QUEUED','RUNNING','FAILED_FINAL','CANCELLED'],
    SUCCEEDED: [],
    SKIPPED_CURRENT: [],
    FAILED_FINAL: [],
    CANCELLED: [],
  },
  artifact: {
    AVAILABLE: ['STALE','SUPERSEDED','INVALID'],
    INCOMPLETE: ['AVAILABLE','INVALID','SUPERSEDED'],
    STALE: ['SUPERSEDED'],
    INVALID: ['SUPERSEDED'],
    SUPERSEDED: [],
  },
  enrichment: {
    NOT_REQUESTED: ['PENDING'],
    PENDING: ['RUNNING','FAILED_FINAL'],
    RUNNING: ['READY','PARTIAL','FAILED_RETRYABLE','FAILED_FINAL'],
    PARTIAL: ['RUNNING','READY','FAILED_RETRYABLE','FAILED_FINAL'],
    FAILED_RETRYABLE: ['PENDING','RUNNING','FAILED_FINAL'],
    READY: [],
    FAILED_FINAL: [],
  },
  promotion: {
    NOT_CANDIDATE: ['CANDIDATE'],
    CANDIDATE: ['PENDING_REVIEW_OR_POLICY','PROMOTED','REJECTED'],
    PENDING_REVIEW_OR_POLICY: ['PROMOTED','REJECTED'],
    PROMOTED: ['SUPERSEDED'],
    REJECTED: ['CANDIDATE'],
    SUPERSEDED: [],
  },
});

export function canTransition(machine, from, to) {
  if (!transitions[machine]) throw new TypeError(`unknown state machine: ${machine}`);
  if (from === to) return true;
  return (transitions[machine][from] ?? []).includes(to);
}

export function assertTransition(machine, from, to) {
  if (!canTransition(machine, from, to)) {
    throw new Error(`invalid ${machine} transition: ${from} -> ${to}`);
  }
  return to;
}

export function allowedTransitions(machine, from) {
  if (!transitions[machine]) throw new TypeError(`unknown state machine: ${machine}`);
  return Object.freeze([...(transitions[machine][from] ?? [])]);
}
