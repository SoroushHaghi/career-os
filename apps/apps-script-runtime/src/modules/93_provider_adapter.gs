function careerOsVnextVisionExtract_(request) {
  const startedAt = Date.now();

  try {
    const result = callGeminiImage_(
      request.apiKey,
      request.base64Data,
      request.mimeType,
      request.prompt
    );

    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        model:
          result && result.model || '',
        status: 'SUCCESS',
        durationMs:
          Date.now() - startedAt
      }
    );

    return {
      text: result && result.text || '',
      provider: 'gemini',
      model: result && result.model || '',
      method: 'vision_extract'
    };
  } catch (error) {
    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        status: 'ERROR',
        durationMs:
          Date.now() - startedAt,
        httpStatus:
          error && error.httpStatus || 0,
        error:
          error && error.message || error
      }
    );

    throw error;
  }
}

function careerOsGetAudioTranscriptionProvider_() {
  const configured =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          'CAREER_OS_AUDIO_TRANSCRIPTION_PROVIDER'
        ) ||
      CAREER_OS_CONFIG
        .AUDIO_TRANSCRIPTION_PROVIDER_DEFAULT ||
      'gemini'
    )
      .trim()
      .toLowerCase();

  if (
    configured !== 'gemini' &&
    configured !== 'groq'
  ) {
    throw new Error(
      'Unsupported audio transcription provider: ' +
      configured
    );
  }

  return configured;
}

function careerOsVnextTranscribe_(request) {
  const provider =
    careerOsGetAudioTranscriptionProvider_();

  const startedAt =
    Date.now();

  try {
    if (provider === 'groq') {
      const result =
        callGroqWhisperTranscription_(
          request
        );

      careerOsProviderTelemetryRecord_(
        'groq',
        {
          model:
            result && result.model || '',
          status: 'SUCCESS',
          durationMs:
            Date.now() - startedAt
        }
      );

      return {
        text: result && result.text || '',
        provider: 'groq',
        model: result && result.model || '',
        method:
          result &&
          result.method ||
          'groq_transcribe'
      };
    }

    const result = callGemini38AudioTranscript_(
      request.apiKey,
      request.fileUri,
      request.mimeType
    );

    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        model:
          result && result.model || '',
        status: 'SUCCESS',
        durationMs:
          Date.now() - startedAt
      }
    );

    return {
      text: result && result.text || '',
      provider: 'gemini',
      model: result && result.model || '',
      method: result && result.method || 'transcribe'
    };
  } catch (error) {
    careerOsProviderTelemetryRecord_(
      provider,
      {
        status: 'ERROR',
        durationMs:
          Date.now() - startedAt,
        httpStatus:
          error && error.httpStatus || 0,
        error:
          error && error.message || error
      }
    );

    throw error;
  }
}

function careerOsVnextAudioNavigation_(request) {
  const startedAt =
    Date.now();

  try {
    const result = callGemini38AudioNavigation_(
      request.apiKey,
      request.fileUri,
      request.mimeType
    );

    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        model:
          result && result.model || '',
        status: 'SUCCESS',
        durationMs:
          Date.now() - startedAt
      }
    );

    return {
      text: result && result.text || '',
      provider: 'gemini',
      model: result && result.model || '',
      method: 'audio_navigation'
    };
  } catch (error) {
    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        status: 'ERROR',
        durationMs:
          Date.now() - startedAt,
        httpStatus:
          error && error.httpStatus || 0,
        error:
          error && error.message || error
      }
    );

    throw error;
  }
}

function careerOsVnextAudioTranscriptFallback_(request) {
  const startedAt =
    Date.now();

  try {
    const result = callGeminiAudioTranscriptFallback_(
      request.apiKey,
      request.fileUri,
      request.mimeType
    );

    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        model:
          result && result.model || '',
        status: 'SUCCESS',
        durationMs:
          Date.now() - startedAt
      }
    );

    return {
      text: result && result.text || '',
      provider: 'gemini',
      model: result && result.model || '',
      method: result && result.method || 'audio_transcript_fallback'
    };
  } catch (error) {
    careerOsProviderTelemetryRecord_(
      'gemini',
      {
        status: 'ERROR',
        durationMs:
          Date.now() - startedAt,
        httpStatus:
          error && error.httpStatus || 0,
        error:
          error && error.message || error
      }
    );

    throw error;
  }
}
