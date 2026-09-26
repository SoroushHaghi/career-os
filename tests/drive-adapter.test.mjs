import test from 'node:test';
import assert from 'node:assert/strict';
import { driveVersionIdentity, normalizeDriveFile, shouldIgnoreAsGenerated } from '../packages/drive-adapter/src/normalize.mjs';

test('Drive file id remains logical source identity', () => {
  const { source } = normalizeDriveFile({
    id: 'FILE_1',
    name: 'sample.m4a',
    mimeType: 'audio/mpeg',
    md5Checksum: 'ABC',
    modifiedTime: '2026-09-27T00:00:00Z',
    parents: ['FOLDER_1'],
  }, { observedAt: '2026-09-27T00:01:00Z' });

  assert.equal(source.sourceKey, 'drive:FILE_1');
  assert.equal(source.sourceType, 'audio');
});

test('md5 content identity wins over modifiedTime', () => {
  const a = driveVersionIdentity({ md5Checksum: 'ABC', modifiedTime: '2026-09-27T00:00:00Z' });
  const b = driveVersionIdentity({ md5Checksum: 'ABC', modifiedTime: '2026-09-28T00:00:00Z' });
  assert.deepEqual(a, b);
});

test('parent folders become context hints, not canonical truth', () => {
  const { contextHints } = normalizeDriveFile({
    id: 'FILE_1',
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    md5Checksum: 'ABC',
    parents: ['FOLDER_X'],
  }, {
    observedAt: '2026-09-27T00:01:00Z',
    parentLabels: { FOLDER_X: 'test' },
  });

  assert.equal(contextHints[0].contextId, 'drive-folder:FOLDER_X');
  assert.equal(contextHints[0].label, 'test');
  assert.equal(contextHints[0].method, 'drive_parent');
});

test('Career OS-generated sidecars are identifiable', () => {
  assert.equal(shouldIgnoreAsGenerated({ appProperties: { careerOsGenerated: 'true' } }), true);
});
