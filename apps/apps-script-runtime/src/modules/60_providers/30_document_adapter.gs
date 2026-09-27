function careerOsVnextDocumentExtract_(request) {
  const result =
    callGeminiDocument_(
      request.apiKey,
      request.base64Data,
      request.mimeType,
      request.prompt
    );

  return {
    text:
      result &&
      result.text ||
      '',
    provider:
      'gemini',
    model:
      result &&
      result.model ||
      '',
    method:
      'document_visual_extract'
  };
}
