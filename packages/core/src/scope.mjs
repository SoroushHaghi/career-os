export function isInProcessingScope({
  sourceKey,
  contextIds = [],
  allowSourceKeys = [],
  allowContextIds = [],
}) {
  const allowedSources = new Set(allowSourceKeys.map(String));
  const allowedContexts = new Set(allowContextIds.map(String));
  if (allowedSources.has(String(sourceKey ?? ''))) return true;
  return contextIds.map(String).some((id) => allowedContexts.has(id));
}

export function buildScopeDecision(input) {
  return isInProcessingScope(input)
    ? { inScope: true, reason: 'allowlist_match' }
    : { inScope: false, reason: 'no_allowlist_match' };
}
