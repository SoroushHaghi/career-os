function careerOsVnextVisionExtract_(request) {
  const result = callGeminiImage_(
    request.apiKey,
    request.base64Data,
    request.mimeType,
    request.prompt
  );

  return {
    text: result && result.text || '',
    provider: 'gemini',
    model: result && result.model || '',
    method: 'vision_extract'
  };
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

  if (provider === 'groq') {
    const result =
      callGroqWhisperTranscription_(
        request
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

  return {
    text: result && result.text || '',
    provider: 'gemini',
    model: result && result.model || '',
    method: result && result.method || 'transcribe'
  };
}

function careerOsVnextAudioNavigation_(request) {
  const result = callGemini38AudioNavigation_(
    request.apiKey,
    request.fileUri,
    request.mimeType
  );

  return {
    text: result && result.text || '',
    provider: 'gemini',
    model: result && result.model || '',
    method: 'audio_navigation'
  };
}

function careerOsVnextAudioTranscriptFallback_(request) {
  const result = callGeminiAudioTranscriptFallback_(
    request.apiKey,
    request.fileUri,
    request.mimeType
  );

  return {
    text: result && result.text || '',
    provider: 'gemini',
    model: result && result.model || '',
    method: result && result.method || 'audio_transcript_fallback'
  };
}
