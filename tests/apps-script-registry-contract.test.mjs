import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/92_registry_projection.gs',
  'utf8'
);

test('Apps Script registry writer emits the milestone-1 registry files', () => {
  for (const name of [
    'CONTEXT_MANIFEST.json',
    'sources.jsonl',
    'artifacts.jsonl',
    'evidence.jsonl',
    'processing.jsonl',
  ]) {
    assert.equal(source.includes(name), true, name);
  }
});

test('Apps Script registry writer marks generated projection ownership', () => {
  assert.equal(source.includes("careerOsGenerated: 'true'"), true);
  assert.equal(source.includes('careerOsVnextContextId'), true);
});

test('Apps Script registry writer is context-scoped rather than global', () => {
  assert.equal(source.includes('careerOsVnextWriteContextRegistryProjection_'), true);
  assert.equal(source.includes("careerOsVnextGetOrCreateChildFolder_"), true);
});


test('Apps Script registry writer collects workspace artifacts and evidence refs', () => {
  assert.equal(source.includes('careerOsVnextCollectWorkspaceArtifacts_'), true);
  assert.equal(source.includes("'drive-artifact:'"), true);
  assert.equal(source.includes("'drive-evidence:'"), true);
  assert.equal(source.includes("state:\n        'AVAILABLE'"), true);
});
