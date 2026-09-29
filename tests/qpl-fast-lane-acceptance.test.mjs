import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  '.github/workflows/qpl-l1-fast-lane-acceptance.yml',
  'utf8'
);

test('QPL acceptance keeps incomplete lanes waiting', () => {
  assert.match(workflow, /imageQueueRemaining/);
  assert.match(workflow, /audioQueueRemaining/);
  assert.match(workflow, /Keep image-lane task waiting/);
  assert.match(workflow, /Keep audio-lane task waiting/);
  assert.match(workflow, /"status":"WAITING"/);
  assert.match(workflow, /next image worker invocation/);
  assert.match(workflow, /next audio worker invocation/);
});

test('QPL root task completes only when both lane queues reach zero', () => {
  assert.match(
    workflow,
    /needs\.image_lane\.outputs\.remaining == '0' && needs\.audio_lane\.outputs\.remaining == '0'/
  );
  assert.match(workflow, /Keep root acceptance waiting/);
  assert.match(workflow, /imageQueueRemaining=\$\{\{ needs\.image_lane\.outputs\.remaining \}\}/);
  assert.match(workflow, /audioQueueRemaining=\$\{\{ needs\.audio_lane\.outputs\.remaining \}\}/);
});
