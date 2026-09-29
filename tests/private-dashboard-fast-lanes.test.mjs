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


test('private dashboard renders engineering activity and no stale activity element', () => {
  assert.match(source, /Engineering activity/);
  assert.match(source, /careerOsPrivateDashboardEngineeringState_/);
  assert.match(source, /id="engineering"/);
  assert.doesNotMatch(source, /getElementById\("activity"\)/);
});


test('private dashboard shows assistant live task from private runtime doc', () => {
  assert.match(source, /Assistant current task/);
  assert.match(source, /_CAREER_OS_ASSISTANT_LIVE_STATUS/);
  assert.match(source, /careerOsPrivateDashboardAssistantStatus_/);
  assert.match(source, /id="assistantTask"/);
});
