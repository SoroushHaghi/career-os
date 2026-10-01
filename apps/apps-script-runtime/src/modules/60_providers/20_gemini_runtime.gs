// Extracted from the characterized Apps Script baseline.
// Provider transport/runtime compatibility. Keep secrets in Script Properties.

function callGeminiDocument_(
  apiKey,
  base64Data,
  mimeType,
  prompt
) {
  const primaryModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_PRIMARY;

  const fallbackModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_FALLBACK;

  try {
    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      primaryModel
    );
  } catch (primaryError) {
    if (
      !shouldFallbackGeminiImageError_(
        primaryError
      ) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw primaryError;
    }

    console.log(
      'GEMINI_PDF_PRIMARY_FAILED_FALLBACK: ' +
      primaryModel +
      ' -> ' +
      fallbackModel +
      ' | status=' +
      Number(
        primaryError.httpStatus || 0
      )
    );

    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      fallbackModel
    );
  }
}

function callGeminiDocumentWithModel_(
  apiKey,
  base64Data,
  mimeType,
  prompt,
  model
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'document',
        data: base64Data,
        mime_type: mimeType
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG.GEMINI_PDF_THINKING_LEVEL
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
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
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
      'GEMINI_PDF_HTTP_ERROR: ' +
      status +
      ' | model=' +
      model
    );

    throw createRetryAwareHttpError_(
      'Gemini PDF request failed for model ' +
      model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model
  };
}

function callGeminiImage_(
  apiKey,
  base64Data,
  mimeType,
  prompt
) {
  const primaryModel =
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_PRIMARY;

  const fallbackModel =
    CAREER_OS_CONFIG.GEMINI_IMAGE_MODEL_FALLBACK;

  try {
    return callGeminiImageWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      primaryModel
    );
  }
  catch (primaryError) {
    if (
      !shouldFallbackGeminiImageError_(primaryError) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw primaryError;
    }

    console.log(
      'GEMINI_IMAGE_PRIMARY_FAILED_FALLBACK: ' +
      primaryModel + ' -> ' + fallbackModel +
      ' | status=' + Number(primaryError.httpStatus || 0)
    );

    return callGeminiImageWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      fallbackModel
    );
  }
}

function shouldFallbackGeminiImageError_(error) {
  const status =
    Number(error && error.httpStatus || 0);

  // Fallback for model/input availability, quota/capacity, and transient server errors.
  // Authentication/authorization failures should surface immediately instead.
  return (
    status === 0 ||
    status === 400 ||
    status === 404 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500
  );
}

function callGeminiImageWithModel_(
  apiKey,
  base64Data,
  mimeType,
  prompt,
  model
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,

    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'image',
        data: base64Data,
        mime_type: mimeType,
        resolution:
          CAREER_OS_CONFIG
            .GEMINI_IMAGE_MEDIA_RESOLUTION
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG.GEMINI_IMAGE_THINKING_LEVEL
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

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GEMINI_IMAGE_HTTP_ERROR: ' + status +
      ' | model=' + model
    );
    console.log(body);

    throw createRetryAwareHttpError_(
      'Gemini image request failed for model ' + model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text: extractGeminiText_(data),
    model: model
  };
}

function applyGemini38ThinkingConfig_(
  payload,
  model,
  thinkingLevel
) {
  if (String(model || '') !== 'gemini-3.8-flash') {
    return payload;
  }

  const level =
    String(thinkingLevel || '')
      .trim()
      .toLowerCase();

  const allowedLevels = {
    low: true,
    medium: true,
    high: true
  };

  if (!allowedLevels[level]) {
    throw new Error(
      'Invalid Gemini 3.8 thinking level: ' +
      String(thinkingLevel) +
      '. Allowed: low, medium, high.'
    );
  }

  payload.generation_config =
    Object.assign(
      {},
      payload.generation_config || {},
      {
        thinking_level: level
      }
    );

  return payload;
}

function extractGeminiText_(data) {

  if (data.output_text) {
    return data.output_text;
  }


  if (
    data.interaction &&
    data.interaction.output_text
  ) {
    return (
      data.interaction.output_text
    );
  }


  if (
    data.interaction &&
    data.interaction.outputText
  ) {
    return (
      data.interaction.outputText
    );
  }


  // Current Interactions API structure.
  if (
    Array.isArray(data.steps)
  ) {
    const texts = [];


    data.steps.forEach(
      step => {

        if (
          step.type ===
            'model_output' &&
          Array.isArray(
            step.content
          )
        ) {

          step.content.forEach(
            item => {

              if (
                item.type ===
                  'text' &&
                item.text
              ) {
                texts.push(
                  item.text
                );
              }

            }
          );

        }

      }
    );


    if (texts.length > 0) {
      return texts
        .join('\n')
        .trim();
    }
  }


  // Older generateContent-style fallback.
  if (
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    Array.isArray(
      data.candidates[0]
        .content.parts
    )
  ) {

    return (
      data.candidates[0]
        .content.parts
        .map(
          part =>
            part.text || ''
        )
        .join('\n')
        .trim()
    );
  }


  console.log(
    'Unexpected Gemini response: ' +
    JSON.stringify(data)
  );


  return '';
}

function shouldFallbackGeminiAudioTranscribeError_(
  error
) {
  const status =
    Number(
      error &&
      error.httpStatus ||
      0
    );

  // Authentication/authorization failures should surface immediately.
  // Model/input limits, quota/capacity and transient failures may safely
  // fall back to the configured emergency audio model.
  return (
    status === 0 ||
    status === 400 ||
    status === 404 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500
  );
}

function callGemini38AudioTranscript_(
  apiKey,
  fileUri,
  mimeType
) {
  return callGeminiAudioTranscriptWithModel_(
    apiKey,
    fileUri,
    mimeType,
    CAREER_OS_CONFIG.GEMINI_AUDIO_TRANSCRIBE_MODEL,
    'gemini_3_8_flash_audio_timestamped_transcript'
  );
}

function callGeminiAudioTranscriptWithModel_(
  apiKey,
  fileUri,
  mimeType,
  model,
  method
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent';

  const prompt =
    'Create a faithful timestamped transcript of this entire audio. ' +
    'Keep the original spoken language and preserve code-switching. ' +
    'Do not translate, summarize, or omit substantive speech. ' +
    'Return plain text only. ' +
    'Split the transcript into coherent chronological segments and start every segment ' +
    'with an approximate source timestamp in exactly [HH:MM:SS] format. ' +
    'Add a generic speaker label only when reasonably distinguishable, but never invent real names. ' +
    'Preserve technical terms, equations, acronyms, names, and course terminology as accurately as possible.';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt
          },
          {
            file_data: {
              mime_type: mimeType,
              file_uri: fileUri
            }
          }
        ]
      }
    ]
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

  if (
    status < 200 ||
    status >= 300
  ) {
    console.log(
      'GEMINI_AUDIO_TRANSCRIPT_HTTP_ERROR: ' +
      status +
      ' | model=' +
      model +
      ' | body=' +
      String(body || '').substring(0, 700)
    );

    throw createRetryAwareHttpError_(
      'Gemini audio transcript request failed for model ' +
      model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model,
    method:
      method
  };
}

function callGemini35Transcribe_(
  apiKey,
  fileUri,
  mimeType
) {
  const model =
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_TRANSCRIBE_MODEL;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: [
      {
        type: 'audio',
        uri: fileUri,
        mime_type: mimeType
      }
    ],
    generation_config: {
      transcription_config: {
        // Empty language list intentionally enables automatic detection and
        // code-switching. Verbatim is canonical raw evidence.
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
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
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
      'GEMINI_3_5_TRANSCRIBE_HTTP_ERROR: ' +
      status
    );

    throw createRetryAwareHttpError_(
      'Gemini 3.5 Transcribe request failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model,
    method:
      'gemini_3_5_transcribe_verbatim'
  };
}

function callGemini38AudioNavigation_(
  apiKey,
  fileUri,
  mimeType
) {
  const model =
    CAREER_OS_CONFIG
      .GEMINI_AUDIO_NAVIGATION_MODEL;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const prompt =
    'Create a compact navigation index for this audio, not a full transcript. ' +
    'Keep the original spoken language for topic labels. ' +
    'Cover the entire recording in chronological order. ' +
    'Start every line with an approximate segment start timestamp in exactly [HH:MM:SS] format. ' +
    'After the timestamp, add a short speaker label only when reasonably distinguishable ' +
    '(Lecturer, Student, Speaker 1, Speaker 2, etc.; never invent real names), ' +
    'then a concise topic/contents label for that segment. ' +
    'Use enough segments to make the recording easy to navigate, normally around 30 to 120 seconds apart ' +
    'and whenever the topic or speaker clearly changes. ' +
    'Return plain text only; no introduction or conclusion.';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'audio',
        uri: fileUri,
        mime_type: mimeType
      }
    ]
  };

  if (String(model || '') === 'gemini-3.8-flash') {
    applyGemini38ThinkingConfig_(
      payload,
      model,
      CAREER_OS_CONFIG
        .GEMINI_AUDIO_NAVIGATION_THINKING_LEVEL
    );
  }

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
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
    throw createRetryAwareHttpError_(
      'Gemini 3.8 audio navigation request failed.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model
  };
}

function callGeminiAudioTranscriptFallback_(
  apiKey,
  fileUri,
  mimeType
) {
  return callGeminiAudioTranscriptWithModel_(
    apiKey,
    fileUri,
    mimeType,
    CAREER_OS_CONFIG.GEMINI_AUDIO_FALLBACK_MODEL,
    'gemini_3_5_flash_audio_timestamped_fallback'
  );
}

function deleteGeminiUploadedFile_(
  geminiFileName
) {

  if (!geminiFileName) {
    return;
  }


  try {

    const apiKey =
      getGeminiApiKey_();


    const name =
      String(
        geminiFileName
      )
        .replace(
          /^\//,
          ''
        );


    const url =
      'https://generativelanguage.googleapis.com/v1beta/' +
      name;


    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            'delete',

          headers: {
            'x-goog-api-key':
              apiKey
          },

          muteHttpExceptions:
            true
        }
      );


    const status =
      response.getResponseCode();


    if (
      status >= 200 &&
      status < 300
    ) {

      console.log(
        'GEMINI_TEMP_FILE_DELETED: ' +
        name
      );

    } else {

      console.log(
        'GEMINI_TEMP_FILE_DELETE_WARNING: HTTP ' +
        status
      );

    }

  } catch (error) {

    console.log(
      'GEMINI_TEMP_FILE_DELETE_WARNING: ' +
      String(error)
    );

  }
}

function getGeminiApiKey_() {

  const key =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        'GEMINI_API_KEY'
      );


  if (!key) {

    throw new Error(
      'GEMINI_API_KEY is missing ' +
      'from Script Properties.'
    );
  }


  return key;
}
