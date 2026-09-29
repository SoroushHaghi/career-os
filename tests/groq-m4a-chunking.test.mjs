import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/60_providers/55_groq_m4a_chunk_runtime.gs',
  'utf8',
);

const context = vm.createContext({
  console,
  CAREER_OS_CONFIG: {
    GROQ_FREE_TIER_MAX_FILE_BYTES: 24_000_000,
    GROQ_M4A_CHUNK_TARGET_MEDIA_BYTES: 3 * 1024 * 1024,
    GROQ_M4A_MAX_MOOV_BYTES: 8 * 1024 * 1024,
  },
});

new vm.Script(source).runInContext(context);

test('M4A sample selection respects MP4 chunk mapping and byte target', () => {
  const parsed = {
    timescale: 48_000,
    sampleCount: 5,
    sampleSizes: [100000, 100000, 100000, 100000, 100000],
    stscEntries: [
      {
        firstChunk: 1,
        samplesPerChunk: 2,
        sampleDescriptionIndex: 1,
      },
      {
        firstChunk: 3,
        samplesPerChunk: 1,
        sampleDescriptionIndex: 1,
      },
    ],
    chunkOffsets: [1000, 201000, 401000],
    sttsEntries: [{ count: 5, delta: 1024 }],
  };

  const first = context.careerOsM4aSelectSamples_(parsed, 0, 350000);

  assert.equal(first.startSample, 0);
  assert.equal(first.endSampleExclusive, 3);
  assert.equal(first.mediaBytes, 300000);
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.sampleSizes)),
    [100000, 100000, 100000],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.ranges)),
    [
      {
        start: 1000,
        endExclusive: 301000,
        sampleCount: 3,
      },
    ],
  );
  assert.equal(first.complete, false);
  assert.equal(first.durationUnits, 3 * 1024);

  const second = context.careerOsM4aSelectSamples_(parsed, 3, 300000);

  assert.equal(second.startSample, 3);
  assert.equal(second.endSampleExclusive, 5);
  assert.equal(second.mediaBytes, 200000);
  assert.equal(second.complete, true);
  assert.equal(second.startTimeUnits, 3 * 1024);
});

test('M4A repack metadata contains a valid audio sample table', () => {
  const mp4a = context.careerOsM4aBox_(
    'mp4a',
    context.careerOsM4aZeroBytes_(28),
  );

  const parsed = {
    timescale: 44_100,
    mp4aBytes: mp4a,
  };

  const selected = {
    durationUnits: 2048,
    sampleSizes: [123, 456],
    sttsEntries: [{ count: 2, delta: 1024 }],
  };

  const moov = context.careerOsM4aBuildMoov_(parsed, selected, 36);
  const root = context.careerOsM4aReadLocalBox_(moov, 0, moov.length);

  assert.equal(root.type, 'moov');
  assert.equal(root.size, moov.length);

  const children = context.careerOsM4aListLocalBoxes_(
    moov,
    root.dataStart,
    root.end,
  );

  assert.equal(
    children.map((box) => box.type).join(','),
    'mvhd,trak',
  );

  const trak = children[1];
  const mdia = context.careerOsM4aFindLocalBox_(moov, trak, 'mdia');
  const minf = context.careerOsM4aFindLocalBox_(moov, mdia, 'minf');
  const stbl = context.careerOsM4aFindLocalBox_(moov, minf, 'stbl');

  const stsz = context.careerOsM4aFindLocalBox_(moov, stbl, 'stsz');
  const stco = context.careerOsM4aFindLocalBox_(moov, stbl, 'stco');

  assert.equal(context.careerOsM4aReadUint32_(moov, stsz.dataStart + 8), 2);
  assert.equal(context.careerOsM4aReadUint32_(moov, stco.dataStart + 8), 36);
});
