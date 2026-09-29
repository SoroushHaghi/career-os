import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/10_audio_processor.gs',
  'utf8'
);
const worker = readFileSync(
  'apps/apps-script-runtime/src/modules/30_queue/00_worker_runtime.gs',
  'utf8'
);

test('chunked Groq audio continues within the same worker slice', () => {
  const marker = 'AUDIO_CHUNK_PROGRESS_SAVED';
  const idx = audio.indexOf(marker);
  assert.notEqual(idx, -1);
  const tail = audio.slice(idx, idx + 900);
  assert.match(tail, /continue;/);
  assert.doesNotMatch(tail, /return;/);
});

test('fast-lane ledger stays pending when queue work remains', () => {
  assert.match(worker, /imageQueueRemaining > 0\s*\? 'PENDING'/);
  assert.match(worker, /audioQueueRemaining > 0\s*\? 'PENDING'/);
  assert.match(worker, /next image worker slice/);
  assert.match(worker, /next audio worker slice/);
});
