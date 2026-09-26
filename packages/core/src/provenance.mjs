function optionalText(value) {
  return value == null || value === '' ? null : String(value).trim();
}

export function createProvenance(input) {
  if (!input?.originType) throw new TypeError('originType is required');
  if (!input?.createdAt) throw new TypeError('createdAt is required');

  return {
    originType: String(input.originType),
    sourceRefs: [...new Set((input.sourceRefs ?? []).map(String))],
    artifactRefs: [...new Set((input.artifactRefs ?? []).map(String))],
    processor: optionalText(input.processor),
    processorVersion: optionalText(input.processorVersion),
    provider: optionalText(input.provider),
    model: optionalText(input.model),
    createdAt: String(input.createdAt),
    actor: optionalText(input.actor),
  };
}
