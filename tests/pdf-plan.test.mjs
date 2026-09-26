import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePdfEvidence, planPdfExtraction } from '../packages/processing/src/pdf-plan.mjs';

test('sufficient deterministic PDF text avoids provider use', () => {
  const result = planPdfExtraction({
    deterministicText: 'x'.repeat(80),
    sourceSizeBytes: 1000000,
  });
  assert.equal(result.providerRequired, false);
  assert.equal(result.method, 'deterministic_text');
});

test('insufficient deterministic text falls back to provider when size is safe', () => {
  const result = planPdfExtraction({
    deterministicText: 'short',
    sourceSizeBytes: 1000000,
  });
  assert.equal(result.providerRequired, true);
  assert.equal(result.method, 'provider_visual_fallback');
});

test('oversized PDF does not attempt unsafe inline provider fallback', () => {
  const result = planPdfExtraction({
    deterministicText: '',
    sourceSizeBytes: 40 * 1024 * 1024,
  });
  assert.equal(result.providerRequired, false);
  assert.equal(result.method, 'blocked_provider_fallback');
});

test('PDF evidence preserves extraction channel and order', () => {
  const merged = mergePdfEvidence({
    deterministicEvidence: [{ evidenceId: 'D1', order: 1 }],
    providerEvidence: [{ evidenceId: 'V1', order: 2 }],
  });
  assert.equal(merged[0].extractionChannel, 'deterministic');
  assert.equal(merged[1].extractionChannel, 'provider_visual');
});
