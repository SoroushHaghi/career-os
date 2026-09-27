import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/40_cutover_public_commands.gs',
  'utf8'
);

test('public cutover command is visible to Apps Script function picker', () => {
  assert.equal(
    source.includes('function runCareerOsCutoverPhase1()'),
    true
  );
  assert.equal(
    source.includes('function runCareerOsCutoverSnapshotStatus()'),
    true
  );
});

test('Phase 1 fails closed unless staging is frozen', () => {
  for (const token of [
    "preflight.environment !== 'staging'",
    'preflight.triggerCount !== 0',
    'preflight.scannerAllowed',
    'preflight.triggerMutationAllowed',
    'preflight.workerAllowed',
  ]) {
    assert.equal(source.includes(token), true, token);
  }
});

test('Phase 1 creates state snapshot and runs shadow test only', () => {
  assert.equal(
    source.includes('careerOsCreateCutoverStateSnapshot_()'),
    true
  );
  assert.equal(
    source.includes('runCareerOsVnextShadowSelfTest()'),
    true
  );
  assert.equal(source.includes('processCareerOsQueues()'), false);
  assert.equal(source.includes('UrlFetchApp.fetch'), false);
});
