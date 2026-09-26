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


test('sha256 is a valid binary source version when md5 is absent', () => {
  const v = driveVersionIdentity({
    sha256Checksum: 'ABCDEF',
    modifiedTime: '2026-09-27T00:00:00Z',
  });
  assert.equal(v.versionId, 'sha256:abcdef');
  assert.equal(v.fingerprintType, 'sha256');
});

test('folder identity is stable even without content checksum', () => {
  const v = driveVersionIdentity({
    id: 'FOLDER_1',
    mimeType: 'application/vnd.google-apps.folder',
    modifiedTime: '2026-09-27T00:00:00Z',
  });
  assert.equal(v.versionId, 'folder-id:FOLDER_1');
  assert.equal(v.fingerprintType, 'folder_id');
});

test('binary fallback includes size and modified time rather than time alone', () => {
  const v = driveVersionIdentity({
    size: '12345',
    modifiedTime: '2026-09-27T00:00:00Z',
    mimeType: 'application/octet-stream',
  });
  assert.equal(v.versionId, 'fallback:12345:2026-09-27T00:00:00Z');
  assert.equal(v.fingerprintType, 'size_modified_fallback');
});
