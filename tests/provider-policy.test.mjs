import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertAllowedModel, isFreeOnlyPolicy, providerRoute } from '../packages/processing/src/provider-policy.mjs';

const policy = JSON.parse(readFileSync('config/provider-policy.defaults.json', 'utf8'));

test('baseline provider policy is free-only', () => {
  assert.equal(isFreeOnlyPolicy(policy), true);
});

test('vision route preserves primary and fallback models', () => {
  const route = providerRoute(policy, 'vision_extract');
  assert.equal(route.primary, 'gemini-3.8-flash');
  assert.equal(route.fallback, 'gemini-3.5-flash-lite');
  assert.equal(route.thinkingLevel, 'low');
  assert.equal(route.mediaResolution, 'high');
});

test('transcription route preserves dedicated transcription primary', () => {
  const route = providerRoute(policy, 'transcribe');
  assert.equal(route.primary, 'gemini-3.5-transcribe');
  assert.equal(route.fallback, 'gemini-3.8-flash');
});

test('unlisted model is rejected', () => {
  assert.throws(() => assertAllowedModel(policy, 'gemini-not-allowed'));
});
