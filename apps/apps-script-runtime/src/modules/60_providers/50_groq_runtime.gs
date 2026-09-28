function getCareerOsGroqApiKey_() {
  const value =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        'GROQ_API_KEY'
      );

  if (!value) {
    throw new Error(
      'GROQ_API_KEY is missing from Script Properties.'
    );
  }

  return String(value).trim();
}

function getCareerOsAudioProxyConfig_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const baseUrl =
    String(
      props.getProperty(
        'CAREER_OS_AUDIO_PROXY_BASE_URL'
      ) || ''
    )
      .trim()
      .replace(/\/+$/, '');

  const sharedSecret =
    String(
      props.getProperty(
        'CAREER_OS_AUDIO_PROXY_SHARED_SECRET'
      ) || ''
    ).trim();

  if (!baseUrl) {
    throw new Error(
      'CAREER_OS_AUDIO_PROXY_BASE_URL is missing from Script Properties.'
    );
  }

  if (!sharedSecret) {
    throw new Error(
      'CAREER_OS_AUDIO_PROXY_SHARED_SECRET is missing from Script Properties.'
    );
  }

  return {
    baseUrl: baseUrl,
    sharedSecret: sharedSecret
  };
}

function careerOsBytesToHex_(bytes) {
  return (bytes || [])
    .map(
      value => {
        const normalized =
          Number(value) < 0
            ? Number(value) + 256
            : Number(value);

        return normalized
          .toString(16)
          .padStart(2, '0');
      }
    )
    .join('');
}

function createCareerOsSignedAudioProxyUrl_(
  fileId
) {
  const proxy =
    getCareerOsAudioProxyConfig_();

  const expires =
    Math.floor(
      Date.now() / 1000
    ) +
    CAREER_OS_CONFIG
      .AUDIO_PROXY_LEASE_SECONDS;

  const signingInput =
    String(fileId) +
    '.' +
    String(expires);

  const signatureBytes =
    Utilities
      .computeHmacSha256Signature(
        signingInput,
        proxy.sharedSecret
      );

  const signature =
    careerOsBytesToHex_(
      signatureBytes
    );

  return (
    proxy.baseUrl +
    '/v1/media/' +
    encodeURIComponent(
      String(fileId)
    ) +
    '?expires=' +
    encodeURIComponent(
      String(expires)
    ) +
    '&sig=' +
    encodeURIComponent(
      signature
    )
  );
}

function buildGroqMultipartPayload_(
  fields,
  boundary
) {
  const lines = [];

  (fields || [])
    .forEach(
      field => {
        lines.push(
          '--' + boundary
        );

        lines.push(
          'Content-Disposition: form-data; name="' +
          String(field.name)
            .replace(/"/g, '') +
          '"'
        );

        lines.push('');
        lines.push(
          String(field.value)
        );
      }
    );

  lines.push(
    '--' + boundary + '--'
  );
  lines.push('');

  return lines.join('\r\n');
}

function formatGroqTimestamp_(
  seconds
) {
  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds || 0)
      )
    );

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const secs =
    total % 60;

  return (
    '[' +
    String(hours)
      .padStart(2, '0') +
    ':' +
    String(minutes)
      .padStart(2, '0') +
    ':' +
    String(secs)
      .padStart(2, '0') +
    ']'
  );
}

function formatGroqWhisperTranscript_(
  data
) {
  const segments =
    Array.isArray(
      data && data.segments
    )
      ? data.segments
      : [];

  if (segments.length > 0) {
    return segments
      .map(
        segment => {
          const text =
            String(
              segment &&
              segment.text ||
              ''
            )
              .trim();

          if (!text) {
            return '';
          }

          return (
            formatGroqTimestamp_(
              segment.start
            ) +
            ' ' +
            text
          );
        }
      )
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return String(
    data && data.text || ''
  ).trim();
}

function callGroqWhisperTranscription_(
  request
) {
  const apiKey =
    getCareerOsGroqApiKey_();

  const model =
    CAREER_OS_CONFIG
      .GROQ_AUDIO_MODEL;

  const mediaUrl =
    createCareerOsSignedAudioProxyUrl_(
      request.fileId
    );

  const boundary =
    '----CareerOsGroq' +
    Utilities
      .getUuid()
      .replace(/-/g, '');

  const payload =
    buildGroqMultipartPayload_(
      [
        {
          name: 'model',
          value: model
        },
        {
          name: 'url',
          value: mediaUrl
        },
        {
          name: 'response_format',
          value: 'verbose_json'
        },
        {
          name: 'timestamp_granularities[]',
          value: 'segment'
        },
        {
          name: 'temperature',
          value: '0'
        }
      ],
      boundary
    );

  const response =
    UrlFetchApp.fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'post',
        contentType:
          'multipart/form-data; boundary=' +
          boundary,
        headers: {
          Authorization:
            'Bearer ' +
            apiKey
        },
        payload:
          payload,
        muteHttpExceptions:
          true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GROQ_AUDIO_TRANSCRIPT_HTTP_ERROR: ' +
      status +
      ' | model=' +
      model +
      ' | body=' +
      String(body || '')
        .substring(0, 700)
    );

    throw createRetryAwareHttpError_(
      'Groq Whisper transcription failed for model ' +
      model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  const text =
    formatGroqWhisperTranscript_(
      data
    );

  if (!text) {
    throw new Error(
      'Groq Whisper returned no transcript text.'
    );
  }

  return {
    text: text,
    model: model,
    provider: 'groq',
    method:
      'groq_whisper_large_v3_private_url'
  };
}
