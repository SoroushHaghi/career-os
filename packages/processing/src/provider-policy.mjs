export function assertAllowedModel(policy, model) {
  const allowed = new Set((policy?.allowed_models ?? []).map(String));
  const value = String(model ?? '');
  if (!value || !allowed.has(value)) {
    throw new Error(`model is not allowed by current provider policy: ${value || '<empty>'}`);
  }
  return value;
}

export function providerRoute(policy, capability) {
  const route = policy?.routes?.[capability];
  if (!route) throw new Error(`provider route is not configured: ${capability}`);

  const primary = assertAllowedModel(policy, route.primary);
  const fallback = route.fallback ? assertAllowedModel(policy, route.fallback) : null;

  return Object.freeze({
    capability,
    primary,
    fallback,
    thinkingLevel: route.thinking_level ?? null,
    mediaResolution: route.media_resolution ?? null,
    mode: policy.mode ?? null,
  });
}

export function isFreeOnlyPolicy(policy) {
  return String(policy?.mode ?? '').toLowerCase() === 'free_only';
}
