import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScopeDecision, isInProcessingScope } from '../packages/core/src/scope.mjs';

test('explicit source allowlist match is in scope', () => {
  assert.equal(isInProcessingScope({
    sourceKey: 'drive:F1',
    allowSourceKeys: ['drive:F1'],
  }), true);
});

test('context allowlist match is in scope', () => {
  assert.equal(isInProcessingScope({
    sourceKey: 'drive:F1',
    contextIds: ['drive-folder:C1'],
    allowContextIds: ['drive-folder:C1'],
  }), true);
});

test('default is outside scope', () => {
  assert.deepEqual(buildScopeDecision({
    sourceKey: 'drive:F1',
    contextIds: ['drive-folder:C2'],
  }), { inScope: false, reason: 'no_allowlist_match' });
});
