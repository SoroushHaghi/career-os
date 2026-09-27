// Runtime/provider diagnostic probes.

function testCareerOsGemini38() {
  assertFreeOnlyConfiguration_();

  const apiKey =
    getGeminiApiKey_();

  const model =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_PRIMARY;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: 'Return exactly CAREER_OS_GEMINI_38_OK.'
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    'low'
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (status < 200 || status >= 300) {
    console.log(
      'GEMINI_3_8_ACCESS_TEST_FAILED: HTTP ' +
      status +
      ' | ' +
      body
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.8 access test failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  const outputText =
    extractGeminiText_(data);

  console.log(
    'GEMINI_3_8_ACCESS_TEST_OK: ' +
    String(outputText || '').trim()
  );

  return String(outputText || '').trim();
}

function buildCareerOsSilentWavBase64_() {
  const sampleRate = 16000;
  const seconds = 1;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample =
    bitsPerSample / 8;
  const dataLength =
    sampleRate *
    seconds *
    channels *
    bytesPerSample;

  const bytes = [];

  function pushAscii(value) {
    String(value)
      .split('')
      .forEach(
        char => bytes.push(
          char.charCodeAt(0)
        )
      );
  }

  function pushLe16(value) {
    bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff
    );
  }

  function pushLe32(value) {
    bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff
    );
  }

  pushAscii('RIFF');
  pushLe32(36 + dataLength);
  pushAscii('WAVE');
  pushAscii('fmt ');
  pushLe32(16);
  pushLe16(1);
  pushLe16(channels);
  pushLe32(sampleRate);
  pushLe32(
    sampleRate *
    channels *
    bytesPerSample
  );
  pushLe16(
    channels *
    bytesPerSample
  );
  pushLe16(bitsPerSample);
  pushAscii('data');
  pushLe32(dataLength);

  for (
    let i = 0;
    i < dataLength;
    i += 1
  ) {
    bytes.push(0);
  }

  return Utilities.base64Encode(
    bytes.map(
      value =>
        value > 127
          ? value - 256
          : value
    )
  );
}

function testCareerOsGemini35Transcribe() {
  assertFreeOnlyConfiguration_();

  const apiKey =
    getGeminiApiKey_();

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model:
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_TRANSCRIBE_MODEL,
    input: [
      {
        type: 'audio',
        data:
          buildCareerOsSilentWavBase64_(),
        mime_type: 'audio/wav'
      }
    ],
    generation_config: {
      transcription_config: {
        language_codes: [],
        mode: {
          type: 'verbatim'
        }
      }
    }
  };

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (status < 200 || status >= 300) {
    console.log(
      'GEMINI_3_5_TRANSCRIBE_ACCESS_TEST_FAILED: HTTP ' +
      status +
      ' | ' +
      body
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.5 Transcribe access test failed.',
      status,
      response,
      body
    );
  }

  console.log(
    'GEMINI_3_5_TRANSCRIBE_ACCESS_TEST_OK: HTTP ' +
    status
  );

  return true;
}

function testCareerOsGeminiStack() {
  assertFreeOnlyConfiguration_();

  testCareerOsGemini38();
  testCareerOsGemini35Transcribe();

  console.log(
    'CAREER_OS_GEMINI_STACK_OK: ' +
    '3.8 Flash + 3.5 Transcribe'
  );

  return true;
}
