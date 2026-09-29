import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runner = readFileSync(
  'scripts/run-staging-session-e2e.mjs',
  'utf8'
);
const workflow = readFileSync(
  '.github/workflows/staging-session-e2e.yml',
  'utf8'
);

test('end-to-end runner orders ingestion, media drain, session synthesis and course synthesis', () => {
  const ingest = runner.indexOf("call('folderIngest')");
  const knowledge = runner.indexOf("call('knowledgeCompile')");
  const course = runner.indexOf("call('courseKnowledgeCompile')");

  assert.ok(ingest >= 0);
  assert.ok(knowledge > ingest);
  assert.ok(course > knowledge);
  assert.match(runner, /imageWorkerOnce/);
  assert.match(runner, /audioWorkerOnce/);
  assert.match(runner, /Promise\.allSettled/);
});

test('end-to-end runner emits aggregate metadata instead of private source payloads', () => {
  assert.doesNotMatch(runner, /console\.log\(health\)/);
  assert.doesNotMatch(runner, /console\.log\(sessionStatus\)/);
  assert.doesNotMatch(runner, /console\.log\(courseStatus\)/);
  assert.match(runner, /includedArtifacts/);
  assert.match(runner, /includedChars/);
  assert.match(runner, /totalMs/);
});

test('end-to-end workflow waits for deployed SHA and selects Gemini free-only fast paths', () => {
  const wait = workflow.indexOf('Wait for exact staging runtime Git SHA');
  const config = workflow.indexOf('Configure free-only fast paths');
  const run = workflow.indexOf(
    'Run source to session to course acceptance'
  );

  assert.ok(wait >= 0);
  assert.ok(config > wait);
  assert.ok(run > config);
  assert.match(
    workflow,
    /CAREER_OS_AUDIO_TRANSCRIPTION_PROVIDER\":\"gemini/
  );
  assert.match(workflow, /gemini-3\.8-flash/);
  assert.match(workflow, /gemini-3\.5-flash/);
});
