import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scanner = readFileSync(
  'apps/apps-script-runtime/src/modules/10_scanner/10_drive_scanner.gs',
  'utf8'
);
const staging = readFileSync(
  'apps/apps-script-runtime/src/modules/95_staging_probe.gs',
  'utf8'
);

test('scanner batches image/audio manifest refreshes per pass', () => {
  assert.match(scanner, /careerOsRefreshSessionManifestMaybe_/);
  assert.match(scanner, /careerOsFlushDeferredManifestUpdates_/);
  assert.match(scanner, /deferredManifestSessionIds/);
  assert.match(scanner, /deferManifestUpdate:\s*true/);
});

test('staging folder ingest flushes manifest once after queue discovery', () => {
  assert.match(staging, /const deferredManifestSessionIds = \{\}/);
  assert.match(staging, /deferManifestUpdate:\s*true/);
  assert.match(staging, /manifestRefreshCount/);
  assert.match(staging, /careerOsFlushDeferredManifestUpdates_/);
});
