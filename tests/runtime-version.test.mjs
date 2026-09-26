import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeVersion } from '../packages/core/src/runtime-version.mjs';

test('runtime version is Git-derived and explicit', () => {
  const v = createRuntimeVersion({
    gitSha: 'abcdef1234567',
    buildVersion: 'vnext-dev',
    schemaVersion: '0.1',
    processingProfiles: { audio: '1' },
  });
  assert.equal(v.gitSha, 'abcdef1234567');
  assert.equal(v.processingProfiles.audio, '1');
});

test('invalid Git identity is rejected', () => {
  assert.throws(() => createRuntimeVersion({
    gitSha: 'not-a-sha',
    buildVersion: 'x',
    schemaVersion: '0.1',
  }));
});
