import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const activitySource = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/15_activity_state.gs',
  'utf8'
);
const ledgerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/16_task_ledger.gs',
  'utf8'
);

function runtime() {
  const store = {};
  const props = {
    getProperty(key) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    setProperty(key, value) {
      store[key] = String(value);
    },
    deleteProperty(key) {
      delete store[key];
    },
  };

  const context = vm.createContext({
    console,
    PropertiesService: {
      getScriptProperties() {
        return props;
      },
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock() {
            return true;
          },
          releaseLock() {},
        };
      },
    },
  });

  vm.runInContext(activitySource, context);
  vm.runInContext(ledgerSource, context);

  return { context, store };
}

test('partial task updates preserve prior metadata and timestamps', () => {
  const { context } = runtime();

  const first = context.careerOsTaskLedgerUpsert_({
    task_id: 't1',
    title: 'QPL L1 audio',
    executor: 'apps-script:audio',
    stage: 'fast_lane:audio',
    status: 'RUNNING',
    depends_on: ['ingest'],
    waiting_for: ['provider'],
  });

  assert.equal(first.status, 'RUNNING');
  assert.ok(first.started_at);

  const startedAt = first.started_at;

  const done = context.careerOsTaskLedgerUpsert_({
    task_id: 't1',
    status: 'DONE',
    current_action: 'chunk finished',
    result_or_error: 'queue remains',
  });

  assert.equal(done.started_at, startedAt);
  assert.equal(done.executor, 'apps-script:audio');
  assert.equal(done.stage, 'fast_lane:audio');
  assert.deepEqual(
    JSON.parse(JSON.stringify(done.depends_on)),
    ['ingest']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(done.waiting_for)),
    ['provider']
  );
  assert.ok(done.finished_at);
});

test('explicit empty dependency/waiting arrays clear previous values', () => {
  const { context } = runtime();

  context.careerOsTaskLedgerUpsert_({
    task_id: 't2',
    status: 'WAITING',
    depends_on: ['a'],
    waiting_for: ['b'],
  });

  const cleared = context.careerOsTaskLedgerUpsert_({
    task_id: 't2',
    depends_on: [],
    waiting_for: [],
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(cleared.depends_on)),
    []
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(cleared.waiting_for)),
    []
  );
});

test('restarting a completed task clears finished_at and gets a new run start', () => {
  const { context } = runtime();

  const first = context.careerOsTaskLedgerUpsert_({
    task_id: 't3',
    status: 'RUNNING',
  });

  const done = context.careerOsTaskLedgerUpsert_({
    task_id: 't3',
    status: 'DONE',
  });

  assert.ok(done.finished_at);

  const restarted = context.careerOsTaskLedgerUpsert_({
    task_id: 't3',
    status: 'RUNNING',
  });

  assert.equal(restarted.finished_at, '');
  assert.ok(restarted.started_at);
  assert.equal(restarted.status, 'RUNNING');
  assert.equal(restarted.task_id, first.task_id);
});
