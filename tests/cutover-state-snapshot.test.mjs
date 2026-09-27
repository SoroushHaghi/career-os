import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/30_cutover_state_snapshot.gs',
  'utf8'
);

test('cutover snapshot uses an explicit non-secret state allowlist', () => {
  for (const token of [
    "'DRIVE_PAGE_TOKEN'",
    'IMAGE_QUEUE_PROPERTY',
    'AUDIO_QUEUE_PROPERTY',
    'GEMINI_GLOBAL_BACKOFF_PROPERTY',
    'RETRY_POLICY_VERSION_PROPERTY',
  ]) {
    assert.equal(source.includes(token), true, token);
  }
  assert.equal(source.includes('GEMINI_API_KEY'), false);
});

test('cutover restore is explicitly gated and does not restore triggers', () => {
  assert.equal(source.includes('CAREER_OS_CUTOVER_RESTORE'), true);
  assert.equal(source.includes('triggerInventoryRestored: false'), true);
});

test('cutover snapshot remains inside Script Properties', () => {
  assert.equal(source.includes('CAREER_OS_CUTOVER_STATE_SNAPSHOT_V1'), true);
  assert.equal(source.includes('DriveApp.createFile'), false);
});
