import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(
  readFileSync('config/apps-script-build-profiles.json', 'utf8')
);

test('Apps Script build profiles define staging and production', () => {
  assert.equal(config.default_profile, 'staging');
  assert.ok(config.profiles.staging);
  assert.ok(config.profiles.production);
});

test('production excludes staging and cutover-only modules', () => {
  const excluded = new Set(config.profiles.production.exclude || []);
  for (const path of [
    '80_runtime/20_cutover_preflight.gs',
    '80_runtime/30_cutover_state_snapshot.gs',
    '80_runtime/40_cutover_public_commands.gs',
    '95_staging_probe.gs',
    '96_registry_probe.gs',
  ]) {
    assert.equal(excluded.has(path), true, path);
  }
});

test('production keeps the core scanner/worker/provider runtime', () => {
  const excluded = new Set(config.profiles.production.exclude || []);
  for (const path of [
    '10_scanner/10_drive_scanner.gs',
    '30_queue/00_worker_runtime.gs',
    '50_processors/10_audio_processor.gs',
    '50_processors/20_image_processor.gs',
    '50_processors/30_pdf_processor.gs',
    '60_providers/20_gemini_runtime.gs',
  ]) {
    assert.equal(excluded.has(path), false, path);
  }
});
