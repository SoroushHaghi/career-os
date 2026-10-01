import test from 'node:test';
import assert from 'node:assert/strict';
import { createChangeBatch, mayAdvanceCursor } from '../packages/drive-adapter/src/change-batch.mjs';

test('change batch deduplicates repeated file events', () => {
  const batch = createChangeBatch({
    cursorBefore: 'T1',
    cursorAfter: 'T2',
    events: [
      { fileId: 'F1', changeTime: 'a' },
      { fileId: 'F1', changeTime: 'b' },
      { fileId: 'F2', changeTime: 'c' },
    ],
  });
  assert.equal(batch.events.length, 2);
  assert.equal(batch.events.find((x) => x.fileId === 'F1').changeTime, 'b');
});

test('cursor advances only after detected files are durably represented', () => {
  const batch = createChangeBatch({
    cursorBefore: 'T1',
    cursorAfter: 'T2',
    events: [{ fileId: 'F1' }, { fileId: 'F2' }],
  });
  assert.equal(mayAdvanceCursor(batch, ['F1']), false);
  assert.equal(mayAdvanceCursor(batch, ['F1', 'F2']), true);
});
