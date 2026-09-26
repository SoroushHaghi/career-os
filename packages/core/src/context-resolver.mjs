const SESSION_PATTERNS = [
  /^\d{1,4}$/,
  /^[LRS]\s*[-_]?\s*\d{1,4}$/i,
  /^(?:session|lecture|chapter|week|block|unit|module)\s*[-_]?\s*\d{1,4}$/i,
];

export const ContextResolutionStatus = Object.freeze({
  RESOLVED_PRIMARY: 'RESOLVED_PRIMARY',
  RESOLVED_MULTIPLE: 'RESOLVED_MULTIPLE',
  UNCLASSIFIED_AUTHORIZED: 'UNCLASSIFIED_AUTHORIZED',
  BLOCKED_POLICY: 'BLOCKED_POLICY',
});

export function looksLikeSessionLabel(label) {
  if (typeof label !== 'string') return false;
  const value = label.trim();
  return value.length > 0 && SESSION_PATTERNS.some((re) => re.test(value));
}

export function resolveContext({ authorizationState, hints = [] }) {
  if (authorizationState !== 'AUTHORIZED') {
    return {
      status: ContextResolutionStatus.BLOCKED_POLICY,
      primary: null,
      bindings: [],
      reason: `processing authorization is ${authorizationState ?? 'UNKNOWN'}`,
    };
  }

  const normalizedHints = hints
    .filter(Boolean)
    .map((hint) => ({
      contextId: hint.contextId ?? null,
      contextKind: hint.contextKind ?? null,
      label: typeof hint.label === 'string' ? hint.label.trim() : '',
      method: hint.method ?? 'unknown',
      confidence: Number.isFinite(hint.confidence) ? hint.confidence : 0,
      isPrimary: Boolean(hint.isPrimary),
    }));

  const confirmed = normalizedHints.filter((h) =>
    h.contextId && h.contextKind && ['user_confirmed', 'manual', 'imported'].includes(h.method)
  );

  if (confirmed.length) {
    const primary = confirmed.find((h) => h.isPrimary) ?? confirmed[0];
    return {
      status: confirmed.length > 1 ? ContextResolutionStatus.RESOLVED_MULTIPLE : ContextResolutionStatus.RESOLVED_PRIMARY,
      primary,
      bindings: confirmed,
      reason: 'explicit context binding',
    };
  }

  const inferred = normalizedHints
    .filter((h) => h.contextId && (h.contextKind || looksLikeSessionLabel(h.label)))
    .map((h) => ({ ...h, contextKind: h.contextKind ?? 'session' }))
    .sort((a, b) => b.confidence - a.confidence);

  if (inferred.length) {
    return {
      status: inferred.length > 1 ? ContextResolutionStatus.RESOLVED_MULTIPLE : ContextResolutionStatus.RESOLVED_PRIMARY,
      primary: inferred[0],
      bindings: inferred,
      reason: inferred[0].contextKind === 'session' ? 'session-like context hint' : 'typed context hint',
    };
  }

  return {
    status: ContextResolutionStatus.UNCLASSIFIED_AUTHORIZED,
    primary: null,
    bindings: [],
    reason: 'authorized source has no sufficiently strong context binding',
  };
}
