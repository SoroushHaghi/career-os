import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ledger = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/16_task_ledger.gs',
  'utf8'
);
const worker = readFileSync(
  'apps/apps-script-runtime/src/modules/30_queue/00_worker_runtime.gs',
  'utf8'
);
const dashboard = readFileSync(
  'apps/apps-script-runtime/src/modules/97_private_dashboard.gs',
  'utf8'
);
const remoteAdmin = readFileSync(
  'apps/apps-script-runtime/src/modules/96_remote_admin.gs',
  'utf8'
);

test('private task ledger carries the minimum operator task contract', () => {
  for (const field of [
    'task_id',
    'parent_id',
    'depends_on',
    'title',
    'executor',
    'stage',
    'status',
    'started_at',
    'updated_at',
    'finished_at',
    'waiting_for',
    'current_action',
    'result_or_error',
  ]) {
    assert.match(ledger, new RegExp(field));
  }
});

test('stale running tasks are not presented as certainly running', () => {
  assert.match(ledger, /LAST_SEEN_RUNNING/);
  assert.match(ledger, /CAREER_OS_TASK_LEDGER_RUNNING_STALE_MS/);
});

test('image and audio fast lanes publish independent ledger tasks', () => {
  assert.match(worker, /apps-script:image:/);
  assert.match(worker, /apps-script:audio:/);
  assert.match(worker, /careerOsTaskLedgerBegin_/);
  assert.match(worker, /careerOsTaskLedgerFinish_/);
  assert.match(worker, /executor:\s*'apps-script:image'/);
  assert.match(worker, /executor:\s*'apps-script:audio'/);
});

test('authenticated staging admin can publish and inspect task ledger state', () => {
  assert.match(remoteAdmin, /action === 'taskUpsert'/);
  assert.match(remoteAdmin, /action === 'taskSnapshot'/);
  assert.match(remoteAdmin, /careerOsVnextAssertStaging_\(\)/);
});

test('operator-first dashboard uses task ledger for running waiting and recent sections', () => {
  assert.match(dashboard, /taskLedger:\s*careerOsTaskLedgerSnapshot_/);
  assert.match(dashboard, /function unifiedTasks/);
  assert.match(dashboard, /LAST_SEEN_RUNNING/);
  assert.match(dashboard, /waiting_for/);
  assert.match(dashboard, /result_or_error/);
});
