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

function careerOsVnextTranscribe_(request) {
  const result = callGemini35Transcribe_(
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
