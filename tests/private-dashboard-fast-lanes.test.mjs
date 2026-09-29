import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/97_private_dashboard.gs',
  'utf8'
);

test('private dashboard exposes image/audio fast-lane state', () => {
  assert.match(source, /careerOsPrivateDashboardLaneState_/);
  assert.match(source, /careerOsWorkerLeaseKey_/);
  assert.match(source, /audio/i);
  assert.match(source, /image/i);
  assert.match(source, /Fast lanes/);
});
