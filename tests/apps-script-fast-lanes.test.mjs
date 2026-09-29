import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/30_queue/00_worker_runtime.gs',
  'utf8'
);

const audioSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/10_audio_processor.gs',
  'utf8'
);

const configSource = readFileSync(
  'apps/apps-script-runtime/src/modules/00_config/10_runtime_config.gs',
  'utf8'
);

test('fast lanes expose independent image and audio worker entry points', () => {
  assert.match(workerSource, /function processCareerOsImageQueue\(\)/);
  assert.match(workerSource, /function processCareerOsAudioQueue\(\)/);
  assert.match(configSource, /IMAGE_QUEUE_WORKER_FUNCTION:\s*'processCareerOsImageQueue'/);
  assert.match(configSource, /AUDIO_QUEUE_WORKER_FUNCTION:\s*'processCareerOsAudioQueue'/);
});

test('fast lanes use independent leases instead of holding one global worker lock', () => {
  assert.match(workerSource, /function careerOsAcquireWorkerLaneLease_/);
  assert.match(configSource, /IMAGE_WORKER_LEASE_PROPERTY/);
  assert.match(configSource, /AUDIO_WORKER_LEASE_PROPERTY/);

  const legacyBody = workerSource.slice(
    workerSource.indexOf('function processCareerOsQueues()'),
    workerSource.indexOf('function ensureQueueWorkerTriggerIfNeeded_()')
  );

  assert.doesNotMatch(
    legacyBody,
    /const lock\s*=\s*LockService\.getScriptLock\(\)/
  );
});

test('production dispatch uses one-shot lane kicks rather than a recurring serial worker', () => {
  assert.match(workerSource, /careerOsScheduleLaneKick_\(\s*'image'\s*\)/);
  assert.match(workerSource, /careerOsScheduleLaneKick_\(\s*'audio'\s*\)/);
  assert.match(workerSource, /\.after\(/);
  assert.doesNotMatch(workerSource, /\.everyMinutes\(/);
  assert.match(configSource, /QUEUE_WORKER_KICK_DELAY_MS:\s*1000/);
});

test('audio queue selection skips retry-waiting head-of-line jobs', () => {
  assert.match(audioSource, /AUDIO_QUEUE_NO_JOB_DUE_YET/);
  assert.match(audioSource, /let selectedIndex\s*=\s*-1/);
  assert.match(audioSource, /candidateNextAttemptAt\s*<=\s*now/);
  assert.match(audioSource, /queue\.splice\(\s*selectedIndex,\s*1\s*\)/);
});

test('legacy umbrella worker remains compatibility-only', () => {
  const start = workerSource.indexOf('function processCareerOsQueues()');
  const end = workerSource.indexOf('function ensureQueueWorkerTriggerIfNeeded_()');
  const body = workerSource.slice(start, end);
  assert.match(body, /processCareerOsImageQueue\(\)/);
  assert.match(body, /processCareerOsAudioQueue\(\)/);
});
