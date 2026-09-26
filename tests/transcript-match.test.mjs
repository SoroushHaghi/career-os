import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeTranscriptText,
  normalizeEvidenceBasename,
  transcriptMatchDecision,
} from '../packages/processing/src/transcript-match.mjs';

test('transcript basename normalization preserves legacy matching behavior', () => {
  assert.equal(normalizeEvidenceBasename('Lecture_10 transcript.txt'), 'lecture 10');
  assert.equal(normalizeEvidenceBasename('Lecture-10.career_os.txt'), 'lecture 10');
});

test('explicit source fingerprint is strongest match', () => {
  const decision = transcriptMatchDecision({
    sourceId: 'A1',
    sourceName: 'lecture.m4a',
    sourceFingerprint: 'HASH_NEW',
    candidate: {
      id: 'T1',
      name: 'anything.txt',
      appProperties: {
        careerOsSourceId: 'A1',
        careerOsSourceFingerprint: 'HASH_NEW',
      },
    },
  });
  assert.deepEqual(decision, { match: true, reason: 'explicit_source_fingerprint' });
});

test('notes and summaries cannot satisfy transcript requirement', () => {
  const candidate = {
    id: 'T1',
    name: 'lecture notes.txt',
    text: '[00:00] '.repeat(100),
  };
  const decision = transcriptMatchDecision({
    sourceId: 'A1',
    sourceName: 'lecture.m4a',
    sourceFingerprint: 'HASH',
    candidate,
  });
  assert.equal(decision.match, false);
});

test('unchanged transcript linked to older changed audio is stale', () => {
  const candidate = {
    id: 'T1',
    name: 'lecture transcript.txt',
    text: 'speaker: ' + 'content '.repeat(400),
    fingerprint: 'TRANSCRIPT_HASH',
  };
  assert.equal(looksLikeTranscriptText(candidate), true);
  const decision = transcriptMatchDecision({
    sourceId: 'A1',
    sourceName: 'lecture.m4a',
    sourceFingerprint: 'AUDIO_NEW',
    candidate,
    previousLink: {
      transcriptId: 'T1',
      audioFingerprint: 'AUDIO_OLD',
      transcriptFingerprint: 'TRANSCRIPT_HASH',
    },
  });
  assert.deepEqual(decision, { match: false, reason: 'stale_external_transcript' });
});
