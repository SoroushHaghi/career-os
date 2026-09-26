export const ProviderCapabilities = Object.freeze([
  'vision_extract',
  'transcribe',
  'generate_structured',
]);

export const ProviderErrorCategories = Object.freeze([
  'RATE_LIMITED',
  'TEMPORARY_UNAVAILABLE',
  'AUTH_FAILED',
  'UNSUPPORTED_INPUT',
  'INPUT_TOO_LARGE',
  'CONTENT_REJECTED',
  'INVALID_RESPONSE',
  'PROVIDER_ERROR',
]);

export function normalizeProviderError(error = {}) {
  const status = Number(error.httpStatus ?? error.status ?? 0);
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '');

  if (status === 429 || code === 'RATE_LIMITED') {
    return { category: 'RATE_LIMITED', retryable: true, retryAfterMs: Number(error.retryAfterMs ?? 0) || null };
  }
  if ([500, 502, 503, 504].includes(status) || code === 'TEMPORARY_UNAVAILABLE') {
    return { category: 'TEMPORARY_UNAVAILABLE', retryable: true, retryAfterMs: Number(error.retryAfterMs ?? 0) || null };
  }
  if (status === 401 || status === 403 || code === 'AUTH_FAILED') {
    return { category: 'AUTH_FAILED', retryable: false, retryAfterMs: null };
  }
  if (status === 413 || code === 'INPUT_TOO_LARGE') {
    return { category: 'INPUT_TOO_LARGE', retryable: false, retryAfterMs: null };
  }
  if (status === 415 || code === 'UNSUPPORTED_INPUT') {
    return { category: 'UNSUPPORTED_INPUT', retryable: false, retryAfterMs: null };
  }
  if (code === 'CONTENT_REJECTED') {
    return { category: 'CONTENT_REJECTED', retryable: false, retryAfterMs: null };
  }
  if (code === 'INVALID_RESPONSE' || /invalid response/i.test(message)) {
    return { category: 'INVALID_RESPONSE', retryable: false, retryAfterMs: null };
  }
  return { category: 'PROVIDER_ERROR', retryable: false, retryAfterMs: null };
}

export function assertProviderAdapter(adapter, capability) {
  if (!ProviderCapabilities.includes(capability)) throw new TypeError(`unsupported capability: ${capability}`);
  if (!adapter || typeof adapter[capability] !== 'function') {
    throw new TypeError(`provider adapter does not implement ${capability}`);
  }
  return adapter;
}
