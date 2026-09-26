import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processAudioWithProvider,
  processImageWithProvider,
  processTextDeterministically,
} from '../packages/processing/src/processors.mjs';

test('text processing is deterministic and provider-free', () => {
  const result = processTextDeterministically({
    sourceVersionKey: 'drive:T1@md5:A',
    text: 'line1\r\nline2',
    contextIds: ['ctx:1'],
  });
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.artifacts[0].content, 'line1\nline2');
  assert.equal(result.evidenceUnits[0].modality, 'text');
});

test('image processor uses narrow vision provider contract', async () => {
  const fake = {
    async vision_extract() {
      return { text: 'visible text', provider: 'fake', model: 'fake-vision' };
    },
  };
  const result = await processImageWithProvider({
    sourceVersionKey: 'drive:I1@md5:A',
    contentAccess: { ref: 'synthetic' },
    provider: fake,
  });
  assert.equal(result.artifacts[0].artifactType, 'SOURCE_TEXT');
  assert.equal(result.evidenceUnits[0].content, 'visible text');
});

test('audio processor preserves provider segments as anchored evidence', async () => {
  const fake = {
    async transcribe() {
      return {
        text: 'hello world',
        provider: 'fake',
        model: 'fake-asr',
        segments: [
          { startMs: 0, endMs: 500, text: 'hello' },
          { startMs: 500, endMs: 1000, text: 'world' },
        ],
      };
    },
  };
  const result = await processAudioWithProvider({
    sourceVersionKey: 'drive:A1@md5:A',
    contentAccess: { ref: 'synthetic' },
    provider: fake,
  });
  assert.equal(result.artifacts[0].artifactType, 'TRANSCRIPT');
  assert.equal(result.evidenceUnits.length, 2);
  assert.deepEqual(result.evidenceUnits[1].anchor, { kind: 'audio', startMs: 500, endMs: 1000 });
});
