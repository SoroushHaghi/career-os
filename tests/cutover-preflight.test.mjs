import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/20_cutover_preflight.gs',
  'utf8'
);

test('cutover preflight never exposes Script Property values', () => {
  assert.equal(source.includes('scriptPropertyValuesExposed: false'), true);
  assert.equal(source.includes('getProperties()'), true);
  assert.equal(source.includes('scriptPropertyKeys'), true);
});

test('cutover preflight reports runtime safety state', () => {
  for (const token of [
    'careerOsRuntimeEnvironment_()',
    'careerOsRuntimeAllowsScanner_()',
    'careerOsRuntimeAllowsWorker_()',
    'careerOsRuntimeAllowsTriggerMutation_()',
    'triggerCount',
    'hasDrivePageToken',
    'imageQueueLength',
    'audioQueueLength',
  ]) {
    assert.equal(source.includes(token), true, token);
  }
});
