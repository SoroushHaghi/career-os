import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const configSource = readFileSync(
  'apps/apps-script-runtime/src/modules/00_config/10_runtime_config.gs',
  'utf8'
);
const audioSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/10_audio_processor.gs',
  'utf8'
);
const imageSource = readFileSync(
  'apps/apps-script-runtime/src/modules/50_processors/20_image_processor.gs',
  'utf8'
);

test('audio fast path uses provider-specific transcription reserves', () => {
  assert.match(configSource, /AUDIO_WORK_BUDGET_MS:\s*320000/);
  assert.match(
    configSource,
    /AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GEMINI:\s*150000/
  );
  assert.match(
    configSource,
    /AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GROQ:\s*60000/
  );
  assert.doesNotMatch(
    configSource,
    /AUDIO_TRANSCRIBE_MIN_REMAINING_MS:\s*270000/
  );
  assert.match(audioSource, /careerOsAudioTranscribeMinRemainingMs_/);
  assert.match(
    audioSource,
    /remaining\s*<\s*careerOsAudioTranscribeMinRemainingMs_\(\)/
  );
});

test('audio reserve helper selects smaller chunk reserve for Groq and long-call reserve for Gemini', () => {
  const helperStart = audioSource.indexOf(
    'function careerOsAudioTranscribeMinRemainingMs_'
  );
  const helperEnd = audioSource.indexOf(
    'function processAudioQueue_',
    helperStart
  );
  const helper = audioSource.slice(helperStart, helperEnd);

  function run(provider) {
    const sandbox = vm.createContext({
      CAREER_OS_CONFIG: {
        AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GROQ: 60000,
        AUDIO_TRANSCRIBE_MIN_REMAINING_MS_GEMINI: 150000,
      },
      careerOsGetAudioTranscriptionProvider_: () => provider,
    });
    vm.runInContext(helper, sandbox);
    return sandbox.careerOsAudioTranscribeMinRemainingMs_();
  }

  assert.equal(run('groq'), 60000);
  assert.equal(run('gemini'), 150000);
});

test('image batch context uses per-execution caches and deterministic image-artifact self-exclusion', () => {
  assert.match(
    imageSource,
    /CAREER_OS_IMAGE_SOURCE_MIME_CACHE_\s*=\s*\{\}/
  );
  assert.match(
    imageSource,
    /CAREER_OS_IMAGE_SEMANTIC_CONTEXT_CACHE_\s*=\s*\{\}/
  );
  assert.match(
    imageSource,
    /careerOsProcessorName[^\n]*\|\| ''\)\s*===\s*\n?\s*'image_visual_analysis'/
  );
  assert.match(
    imageSource,
    /CAREER_OS_IMAGE_SEMANTIC_CONTEXT_CACHE_\[cacheKey\]\s*=\s*result/
  );
  assert.match(
    imageSource,
    /careerOsImageSourceMimeCached_\(sourceId\)/
  );
});

test('image context cache is execution-local, not Script Properties or Drive state', () => {
  const cacheSection = imageSource.slice(
    0,
    imageSource.indexOf(
      'function hasCurrentSemanticImageArtifactForSource_'
    )
  );
  assert.doesNotMatch(cacheSection, /PropertiesService/);
  assert.doesNotMatch(cacheSection, /setProperty/);
  assert.doesNotMatch(cacheSection, /Drive\.Files\.update/);
});
