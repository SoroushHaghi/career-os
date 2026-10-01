export function planPdfExtraction({
  deterministicText = '',
  sourceSizeBytes = null,
  deterministicMinChars = 40,
  providerInlineMaxBytes = 34 * 1024 * 1024,
}) {
  const text = String(deterministicText ?? '').trim();
  const size = sourceSizeBytes == null ? null : Number(sourceSizeBytes);

  if (text.length >= deterministicMinChars) {
    return {
      method: 'deterministic_text',
      providerRequired: false,
      usableText: text,
      reason: 'deterministic_text_sufficient',
    };
  }

  if (Number.isFinite(size) && size > providerInlineMaxBytes) {
    return {
      method: 'blocked_provider_fallback',
      providerRequired: false,
      usableText: text,
      reason: 'source_too_large_for_safe_inline_provider_fallback',
    };
  }

  return {
    method: 'provider_visual_fallback',
    providerRequired: true,
    usableText: text,
    reason: text.length ? 'deterministic_text_insufficient' : 'no_deterministic_text',
  };
}

export function mergePdfEvidence({
  deterministicEvidence = [],
  providerEvidence = [],
}) {
  const all = [...deterministicEvidence, ...providerEvidence];

  return all
    .map((item, index) => ({
      ...item,
      order: Number.isFinite(item.order) ? item.order : index,
      extractionChannel: item.extractionChannel ?? (
        deterministicEvidence.includes(item) ? 'deterministic' : 'provider_visual'
      ),
    }))
    .sort((a, b) => a.order - b.order);
}
