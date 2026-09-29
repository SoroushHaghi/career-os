import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const queueSource = readFileSync(
  'apps/apps-script-runtime/src/modules/30_queue/20_knowledge_queue.gs',
  'utf8'
);
const workerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/30_queue/00_worker_runtime.gs',
  'utf8'
);
const scannerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/10_scanner/10_drive_scanner.gs',
  'utf8'
);
const audioSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/10_audio_processor.gs',
  'utf8'
);
const imageSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/20_image_processor.gs',
  'utf8'
);
const pdfSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/30_pdf_processor.gs',
  'utf8'
);
const textSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/40_text_processor.gs',
  'utf8'
);
const providerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/94_knowledge_provider_adapter.gs',
  'utf8'
);
const compilerSource = readFileSync(
  'apps/apps-script-runtime/src/modules/98_knowledge_compiler_staging.gs',
  'utf8'
);
const courseSource = readFileSync(
  'apps/apps-script-runtime/src/modules/99_course_knowledge_staging.gs',
  'utf8'
);
const envSource = readFileSync(
  'apps/apps-script-runtime/src/modules/80_runtime/05_environment_gate.gs',
  'utf8'
);
const buildSource = readFileSync(
  'scripts/build-apps-script.mjs',
  'utf8'
);
const profiles = JSON.parse(
  readFileSync('config/apps-script-build-profiles.json', 'utf8')
).profiles;

function queueHarness(enabled = true) {
  const store = new Map();
  const scheduled = [];
  const folder = { getId: () => 'session-1' };
  const sandbox = vm.createContext({
    CAREER_OS_CONFIG: {
      KNOWLEDGE_QUEUE_PROPERTY: 'KQ',
      COURSE_KNOWLEDGE_QUEUE_PROPERTY: 'CQ',
      MAX_KNOWLEDGE_QUEUE_LENGTH: 60,
      KNOWLEDGE_COALESCE_DELAY_MS: 15000,
      KNOWLEDGE_MAX_ATTEMPTS: 5,
      KNOWLEDGE_RETRY_MIN_MS: 60000,
      KNOWLEDGE_RETRY_MAX_MS: 600000,
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => store.get(key) || '',
        setProperty: (key, value) => store.set(key, value),
        deleteProperty: (key) => store.delete(key),
      }),
    },
    careerOsRuntimeStateKey_: (key) => key,
    careerOsKnowledgeAutomationEnabled_: () => enabled,
    isValidSessionFolder_: () => true,
    DriveApp: {
      getFolderById: () => folder,
    },
    careerOsScheduleLaneKick_: (lane) => scheduled.push(lane),
    console: { log: () => {} },
  });
  vm.runInContext(queueSource, sandbox);
  return { sandbox, store, scheduled };
}

test('automatic session knowledge queue coalesces repeated evidence events', () => {
  const h = queueHarness(true);

  const first = h.sandbox.careerOsMarkSessionKnowledgeDirty_(
    'session-1',
    'audio_ready'
  );
  const second = h.sandbox.careerOsMarkSessionKnowledgeDirty_(
    'session-1',
    'image_ready'
  );

  assert.equal(first.queued, true);
  assert.equal(second.queued, true);

  const queue = JSON.parse(h.store.get('KQ'));
  assert.equal(queue.length, 1);
  assert.equal(queue[0].sessionFolderId, 'session-1');
  assert.equal(queue[0].reason, 'image_ready');
  assert.equal(queue[0].attempts, 0);
  assert.ok(queue[0].nextAttemptAt >= queue[0].dirtyAt);
  assert.deepEqual(h.scheduled, ['knowledge', 'knowledge']);
});

test('automatic knowledge queue is fail-closed when production flag is disabled', () => {
  const h = queueHarness(false);
  const result = h.sandbox.careerOsMarkSessionKnowledgeDirty_(
    'session-1',
    'text_ready'
  );

  assert.equal(result.queued, false);
  assert.equal(h.store.has('KQ'), false);
  assert.deepEqual(h.scheduled, []);
});

test('environment gate requires production plus explicit ENABLED property', () => {
  assert.match(envSource, /careerOsRuntimeEnvironment_\(\) === 'production'/);
  assert.match(
    envSource,
    /KNOWLEDGE_AUTOMATION_ENABLED_PROPERTY/
  );
  assert.match(envSource, /toUpperCase\(\) === 'ENABLED'/);
});

test('media queues carry session binding and worker waits for same-session media', () => {
  assert.match(scannerSource, /sessionFolderId:[\s\S]*context\.sessionFolder\.getId\(\)/);
  assert.match(imageSource, /sessionFolderId:[\s\S]*fileMeta\.sessionFolderId/);
  assert.match(audioSource, /sessionFolderId:[\s\S]*fileMeta\.sessionFolderId/);
  assert.match(queueSource, /careerOsSessionHasPendingMedia_/);
  assert.match(queueSource, /KNOWLEDGE_SESSION_WAITING_FOR_MEDIA/);
});

test('all source-faithful evidence processors mark the session dirty only after evidence is ready', () => {
  assert.match(textSource, /careerOsMarkSessionKnowledgeDirty_/);
  assert.match(pdfSource, /'pdf_text_ready'/);
  assert.match(imageSource, /'image_visual_analysis_ready'/);
  assert.match(audioSource, /'audio_transcript_ready'/);
});

test('worker scheduler treats session and course knowledge as independent lanes', () => {
  assert.match(workerSource, /lane === 'knowledge'/);
  assert.match(workerSource, /lane === 'course_knowledge'/);
  assert.match(workerSource, /careerOsScheduleLaneKick_\(\s*'knowledge'/);
  assert.match(workerSource, /careerOsScheduleLaneKick_\(\s*'course_knowledge'/);
});

test('production release candidate contains knowledge code but remains property-gated', () => {
  assert.match(
    buildSource,
    /buildProfile === 'staging' \|\| buildProfile === 'production'/
  );

  for (const moduleName of [
    '94_knowledge_provider_adapter.gs',
    '98_knowledge_compiler_staging.gs',
    '99_course_knowledge_staging.gs',
  ]) {
    assert.equal(
      profiles.production.exclude.includes(moduleName),
      false
    );
    assert.equal(
      profiles.dashboard.exclude.includes(moduleName),
      true
    );
  }

  assert.match(providerSource, /automatic/);
  assert.match(providerSource, /careerOsKnowledgeAutomationEnabled_/);
  assert.match(compilerSource, /careerOsRunKnowledgeCompilerAutomatic_/);
  assert.match(courseSource, /careerOsRunCourseKnowledgeAutomatic_/);
});

test('automatic compiler reuses an unchanged completed synthesis instead of spending provider quota', () => {
  assert.match(
    compilerSource,
    /CAREER_OS_SESSION_COMPILER_CONTRACT_VERSION/
  );
  assert.match(
    compilerSource,
    /automatic && json/
  );
  assert.match(
    compilerSource,
    /data\.bundleId !== bundle\.bundleId/
  );
  assert.match(
    compilerSource,
    /reused: true/
  );
});
