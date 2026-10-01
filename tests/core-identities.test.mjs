import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceKey, sourceVersionKey, evidenceId } from '../packages/core/src/identities.mjs';

test('source identity depends on source system + native id, not filename', () => {
  const a = sourceKey('drive', 'FILE_123');
  const b = sourceKey('drive', 'FILE_123');
  assert.equal(a, b);
  assert.equal(a, 'drive:FILE_123');
});

test('content version is separate from logical source identity', () => {
  const source = sourceKey('drive', 'FILE_123');
  assert.notEqual(
    sourceVersionKey(source, 'md5:AAA'),
    sourceVersionKey(source, 'md5:BBB')
  );
});

test('evidence ids are deterministic and anchor-sensitive', () => {
  const base = { sourceVersionKey: 'drive:FILE_123@md5:AAA', processorVersion: 'ocr-v1' };
  const a = evidenceId({ ...base, anchor: { page: 1, region: 'top' } });
  const b = evidenceId({ ...base, anchor: { region: 'top', page: 1 } });
  const c = evidenceId({ ...base, anchor: { page: 2, region: 'top' } });
  assert.equal(a, b);
  assert.notEqual(a, c);
});
